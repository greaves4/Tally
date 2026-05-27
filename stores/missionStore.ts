/**
 * Store global del estado de misiones (Zustand).
 *
 * Lift del state que antes vivía dentro de `useDailyMission`. Antes, cada
 * componente que usaba el hook tenía su propio `useState` + `useEffect` +
 * `watchSteps`, lo que provocaba doble bootstrap y re-renders en cascada al
 * abrir `mission-details` (observación #15 del QA Sprint 4).
 *
 * Ahora:
 * - El bootstrap corre UNA vez por sesión (`isBootstrapped` flag).
 * - La suscripción a `watchSteps` se hace UNA sola vez a nivel store.
 * - `useDailyMission` queda como hook delgado que solo lee de este store.
 *
 * Concurrencia:
 * - `bootstrapPromise` coalesce mounts paralelos (StrictMode, dos componentes
 *   llamando al hook simultáneamente).
 * - `autoCompletePromise` serializa el auto-complete in-vivo (delta de
 *   watchSteps que dispara cumplimiento) para evitar duplicar el streak.
 *
 * Cleanup del subscription: la suscripción persiste por la vida de la app.
 * En React Native el JS context se descarta al cerrar la app y toda la
 * memoria se libera, por lo que NO necesitamos un teardown explícito. Si en
 * el futuro se hace SSR o múltiples instancias del store, agregar un método
 * `dispose()` que llame `subscription.remove()`.
 */

import { create } from 'zustand';

import {
  countConsecutiveBlocks,
  getTemplateById,
} from '@/features/missions/catalog';
import {
  buildDayData,
  buildEvaluatorFromParams,
  selectDailyMission,
} from '@/features/missions/engine';
import type {
  DayData,
  MissionInstance,
  MissionParams,
  StreakState,
  UserContext,
} from '@/features/missions/types';
import {
  processPendingEvaluations,
  regenerateWildcardIfMonday,
} from '@/features/missions/wildcard';
import { getStepSource, type Subscription } from '@/features/steps/sources';
import { formatLocalDate } from '@/lib/dates';
import {
  getMissionForDate,
  getRecentMissionIds,
  getStepsRange,
  getStreakState,
  markMissionCompleted,
  updateStreakState,
  upsertMission,
} from '@/lib/db';

// =====================================================================
// Constantes
// =====================================================================

const RECENT_MISSIONS_LOOKBACK = 7;
const WEEKLY_AVERAGE_DAYS = 7;

// =====================================================================
// Tipos públicos del store
// =====================================================================

export type MissionStreakSnapshot = {
  current: number;
  longest: number;
  wildcardsAvailable: number;
};

type MissionStoreState = {
  // === Estado visible al consumidor ===
  todayMission: MissionInstance | null;
  progress: number;
  isCompleted: boolean;
  streakState: MissionStreakSnapshot;
  isReady: boolean;

  // === Estado interno ===
  /** true cuando el bootstrap ya completó al menos una vez en esta sesión. */
  isBootstrapped: boolean;
  /** Coalesce mounts concurrentes en el primer bootstrap (StrictMode, dos hooks). */
  bootstrapPromise: Promise<void> | null;
  /** Cola para serializar auto-complete in-vivo (Sprint 4 fix #2). */
  autoCompletePromise: Promise<unknown> | null;
  /** Garantiza incrementar el streak una sola vez en sesión. */
  hasAutoCompleted: boolean;
  /** Fecha local del bootstrap (`YYYY-MM-DD`). Misma para todo el día. */
  todayStr: string | null;
  /** Handle del listener de watchSteps. Se setea en el primer bootstrap. */
  subscription: Subscription | null;

  // === Acciones ===
  /** Bootstrap idempotente: no-op si ya está bootstrapped. */
  bootstrap: () => Promise<void>;
  /** Fuerza re-bootstrap (resetea flags). Útil para tests o un futuro "pull-to-refresh". */
  refresh: () => Promise<void>;
};

// =====================================================================
// Helpers locales (puros)
// =====================================================================

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Calcula `progress` (0–1) según el tipo de misión. Igual que la versión
 * anterior en `useDailyMission`, reusa `countConsecutiveBlocks` del catálogo.
 */
function computeProgress(params: MissionParams, dayData: DayData): number {
  switch (params.type) {
    case 'TOTAL_STEPS': {
      if (params.target <= 0) return 1;
      return clamp01(dayData.totalSteps / params.target);
    }
    case 'STEPS_BEFORE_TIME': {
      if (params.target <= 0) return 1;
      let sum = 0;
      for (let h = 0; h < params.hour; h++) {
        sum += dayData.stepsByHour[h] ?? 0;
      }
      return clamp01(sum / params.target);
    }
    case 'STEPS_AFTER_TIME': {
      if (params.target <= 0) return 1;
      let sum = 0;
      for (let h = params.hour; h < dayData.stepsByHour.length; h++) {
        sum += dayData.stepsByHour[h] ?? 0;
      }
      return clamp01(sum / params.target);
    }
    case 'BEAT_AVERAGE': {
      if (params.reference <= 0) return dayData.totalSteps > 0 ? 1 : 0;
      return clamp01(dayData.totalSteps / params.reference);
    }
    case 'CONSECUTIVE_BLOCKS': {
      if (params.blocks <= 0) return 1;
      const completed = countConsecutiveBlocks(
        dayData,
        params.stepsPerBlock,
        params.minMinutesBetween,
      );
      return clamp01(completed / params.blocks);
    }
    case 'NO_ZERO_HOURS': {
      if (params.endHour < params.startHour) return 0;
      const total = params.endHour - params.startHour + 1;
      if (total <= 0) return 0;
      let filled = 0;
      for (let h = params.startHour; h <= params.endHour; h++) {
        if ((dayData.stepsByHour[h] ?? 0) > 0) filled += 1;
      }
      return clamp01(filled / total);
    }
    case 'STREAK_PROTECTION': {
      if (params.maxSteps <= 0) return 1;
      return clamp01(dayData.totalSteps / params.maxSteps);
    }
  }
}

function parseLocalYmd(date: string): Date {
  const parts = date.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date string '${date}', expected 'YYYY-MM-DD'`);
  }
  const [yStr, mStr, dStr] = parts;
  if (yStr === undefined || mStr === undefined || dStr === undefined) {
    throw new Error(`Invalid date string '${date}', expected 'YYYY-MM-DD'`);
  }
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new Error(`Invalid date string '${date}', non-numeric components`);
  }
  return new Date(year, month - 1, day);
}

async function computeWeeklyAverage(today: string): Promise<number> {
  const todayDate = parseLocalYmd(today);
  const to = new Date(todayDate);
  to.setDate(to.getDate() - 1);
  const from = new Date(todayDate);
  from.setDate(from.getDate() - WEEKLY_AVERAGE_DAYS);
  const records = await getStepsRange(formatLocalDate(from), formatLocalDate(to));
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.steps, 0);
  return Math.round(total / WEEKLY_AVERAGE_DAYS);
}

function reconstructMissionInstance(args: {
  templateId: string;
  date: string;
  title: string;
  description: string;
  params: MissionParams;
}): MissionInstance | null {
  const template = getTemplateById(args.templateId);
  if (template === null) {
    console.warn(
      `[missionStore] template '${args.templateId}' no longer in catalog`,
    );
    return null;
  }
  return {
    templateId: args.templateId,
    date: args.date,
    title: args.title,
    description: args.description,
    params: args.params,
    evaluate: buildEvaluatorFromParams(args.params),
  };
}

function streakSnapshot(s: StreakState): MissionStreakSnapshot {
  return {
    current: s.current,
    longest: s.longest,
    wildcardsAvailable: s.wildcardsAvailable,
  };
}

// =====================================================================
// Store
// =====================================================================

export const useMissionStore = create<MissionStoreState>()((set, get) => ({
  todayMission: null,
  progress: 0,
  isCompleted: false,
  streakState: { current: 0, longest: 0, wildcardsAvailable: 0 },
  isReady: false,

  isBootstrapped: false,
  bootstrapPromise: null,
  autoCompletePromise: null,
  hasAutoCompleted: false,
  todayStr: null,
  subscription: null,

  bootstrap: async () => {
    const state = get();
    if (state.isBootstrapped) return;
    if (state.bootstrapPromise !== null) {
      await state.bootstrapPromise;
      return;
    }

    const promise = (async () => {
      try {
        await regenerateWildcardIfMonday();
        await processPendingEvaluations();

        const today = formatLocalDate(new Date());
        const existing = await getMissionForDate(today);

        let instance: MissionInstance | null;
        let alreadyCompletedInDb = false;
        if (existing === null) {
          const [streakCtx, recent, weeklyAverage] = await Promise.all([
            getStreakState(),
            getRecentMissionIds(today, RECENT_MISSIONS_LOOKBACK),
            computeWeeklyAverage(today),
          ]);
          const ctx: UserContext = {
            currentStreak: streakCtx.current,
            recentMissionIds: recent,
            weeklyAverage,
          };
          const template = await selectDailyMission(ctx);
          const generated = template.generateInstance(today, ctx);
          await upsertMission({
            date: today,
            templateId: generated.templateId,
            title: generated.title,
            description: generated.description,
            params: generated.params,
            completed: false,
            completedAt: null,
            usedWildcard: false,
          });
          instance = generated;
        } else {
          instance = reconstructMissionInstance({
            templateId: existing.templateId,
            date: existing.date,
            title: existing.title,
            description: existing.description,
            params: existing.params,
          });
          alreadyCompletedInDb = existing.completed;
        }

        const streak = await getStreakState();

        set({
          todayMission: instance,
          streakState: streakSnapshot(streak),
          todayStr: today,
          hasAutoCompleted: alreadyCompletedInDb,
          isCompleted: alreadyCompletedInDb,
        });

        // Cómputo inicial de progress + auto-complete check.
        await recomputeFromDbInternal();

        // Suscripción global a watchSteps (UNA vez por vida del store).
        if (get().subscription === null) {
          const source = getStepSource();
          const subscription = source.watchSteps(() => {
            void recomputeFromDbInternal();
          });
          set({ subscription });
        }

        set({ isBootstrapped: true });
      } catch (error) {
        console.warn('[missionStore] bootstrap failed:', error);
      } finally {
        set({ bootstrapPromise: null, isReady: true });
      }
    })();

    set({ bootstrapPromise: promise });
    await promise;
  },

  refresh: async () => {
    set({
      isBootstrapped: false,
      hasAutoCompleted: false,
      isReady: false,
    });
    await get().bootstrap();
  },
}));

// =====================================================================
// Internas (no expuestas en el store)
// =====================================================================

/**
 * Recalcula `progress` desde DB y, si la misión cumple ahora, marca completed
 * + suma streak (one-shot por sesión). Se serializa con `autoCompletePromise`
 * para que dos deltas concurrentes no dupliquen el incremento.
 */
async function recomputeFromDbInternal(): Promise<void> {
  const state = useMissionStore.getState();
  const { todayStr, todayMission, hasAutoCompleted } = state;
  if (todayStr === null || todayMission === null) return;

  const dayData = await buildDayData(todayStr);
  const prog = computeProgress(todayMission.params, dayData);
  useMissionStore.setState({ progress: prog });

  if (hasAutoCompleted) {
    useMissionStore.setState({ isCompleted: true });
    return;
  }

  const { completed, streak } = await runAutoComplete(todayStr, todayMission);
  if (completed) {
    useMissionStore.setState({
      hasAutoCompleted: true,
      isCompleted: true,
      streakState: streakSnapshot(streak),
    });
  } else {
    useMissionStore.setState({ isCompleted: false });
  }
}

type AutoCompleteResult = {
  completed: boolean;
  streak: StreakState;
};

/**
 * Auto-complete in-vivo serializado por encadenamiento de promesas.
 * Si dos deltas cruzan el umbral al mismo tiempo, solo UNO marca + suma; el
 * segundo, al releer DB, ve completed=true y sale.
 */
async function runAutoComplete(
  todayStr: string,
  mission: MissionInstance,
): Promise<AutoCompleteResult> {
  const previous =
    useMissionStore.getState().autoCompletePromise ?? Promise.resolve();

  const work = (async (): Promise<AutoCompleteResult> => {
    try {
      await previous;
    } catch {
      // ignore: previous job failure no debe bloquear este
    }
    const status = await getMissionForDate(todayStr);
    if (status?.completed === true) {
      return { completed: true, streak: await getStreakState() };
    }
    const dayData = await buildDayData(todayStr);
    if (!mission.evaluate(dayData)) {
      return { completed: false, streak: await getStreakState() };
    }
    await markMissionCompleted(todayStr, false);
    const current = await getStreakState();
    const newCurrent = current.current + 1;
    const next: StreakState = {
      ...current,
      current: newCurrent,
      longest: Math.max(current.longest, newCurrent),
    };
    await updateStreakState(next);
    return { completed: true, streak: next };
  })();

  const chain = work.finally(() => {
    if (useMissionStore.getState().autoCompletePromise === chain) {
      useMissionStore.setState({ autoCompletePromise: null });
    }
  });
  useMissionStore.setState({ autoCompletePromise: chain });

  return work;
}
