/**
 * Motor de misiones diarias.
 *
 * Responsabilidades:
 * - `selectDailyMission`: elige una plantilla del catálogo aplicando los
 *   filtros de variedad y dificultad descritos en la skill `daily-missions`.
 * - `buildDayData`: arma el snapshot de datos del día (total, por hora, eventos)
 *   leyendo desde la persistencia local.
 * - `evaluateMissionForDate`: reconstruye la función de evaluación a partir de
 *   los `params` persistidos y devuelve si la misión se cumplió.
 *
 * Reglas:
 * - El motor SOLO conoce la interfaz de persistencia (`@/lib/db`) y el
 *   catálogo. No conoce qué `StepSource` alimentó los datos.
 * - Cero side effects en las funciones puras de evaluación: leen `DayData`
 *   y devuelven boolean.
 * - Todas las fechas se manejan en zona LOCAL del dispositivo.
 */

import {
  getDailySteps,
  getMissionForDate,
  getSimulatorStepEventsForRange,
} from '@/lib/db';
import { getEndOfDay, getStartOfDay } from '@/lib/dates';

import { getTemplateById, MISSION_CATALOG } from './catalog';
import type {
  DayData,
  MissionParams,
  MissionTemplate,
  StepEvent,
  UserContext,
} from './types';

// =====================================================================
// Constantes de calibración (declaradas explícitamente, sin números mágicos)
// =====================================================================

/** Cuántas plantillas recientes excluir del subset elegible. */
const RECENT_TO_EXCLUDE = 3;

/** Umbral por debajo del cual BEAT_AVERAGE no es razonable (usuario nuevo). */
const BEAT_AVERAGE_MIN_REFERENCE = 3000;

/** Plantilla fallback si el filtrado deja el subset vacío. */
const FALLBACK_TEMPLATE_ID = 'total-3k';

// =====================================================================
// Helpers de fechas (local)
// =====================================================================

/**
 * Parsea 'YYYY-MM-DD' a un `Date` en zona LOCAL (medianoche local del día
 * indicado). NO usa `new Date('YYYY-MM-DD')`, que interpreta el string como
 * UTC y desplaza un día según la zona horaria.
 */
function parseLocalDate(date: string): Date {
  const parts = date.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date string '${date}', expected 'YYYY-MM-DD'`);
  }
  const [yStr, mStr, dStr] = parts;
  // `noUncheckedIndexedAccess` exige verificar undefined tras el destructuring.
  if (yStr === undefined || mStr === undefined || dStr === undefined) {
    throw new Error(`Invalid date string '${date}', expected 'YYYY-MM-DD'`);
  }
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid date string '${date}', non-numeric components`);
  }
  return new Date(year, month - 1, day);
}

// =====================================================================
// Selección de misión diaria
// =====================================================================

/**
 * Selecciona una plantilla de misión aplicando los filtros descritos en la
 * skill `daily-missions`:
 *
 * 1. Excluye las plantillas usadas en los últimos N días (variedad).
 * 2. Calibra la dificultad máxima según el `currentStreak`:
 *    - streak < 3  → solo dificultad ≤ 3 (no castigar a nuevos usuarios).
 *    - streak 3–7  → dificultad ≤ 4.
 *    - streak > 7  → cualquier dificultad.
 * 3. Excluye BEAT_AVERAGE si el `weeklyAverage` es muy bajo (usuario sin
 *    datos confiables todavía: la skill recomienda misiones fijas las primeras
 *    semanas).
 * 4. Si el subset queda vacío, recurre a un fallback determinístico.
 * 5. Elige pseudo-aleatoriamente del subset resultante.
 *
 * NOTA: usa `Math.random`. El determinismo en este punto NO es requerido
 * porque la selección ocurre UNA sola vez por día y luego se persiste; las
 * lecturas posteriores leen la misión ya elegida.
 */
export async function selectDailyMission(
  userContext: UserContext,
): Promise<MissionTemplate> {
  const recentToExclude = new Set(
    userContext.recentMissionIds.slice(0, RECENT_TO_EXCLUDE),
  );

  // Calibración de dificultad por streak.
  const maxDifficulty: 3 | 4 | 5 =
    userContext.currentStreak > 7 ? 5 : userContext.currentStreak >= 3 ? 4 : 3;

  const subset = MISSION_CATALOG.filter((tpl) => {
    if (recentToExclude.has(tpl.id)) return false;
    if (tpl.difficulty > maxDifficulty) return false;
    // BEAT_AVERAGE solo si hay un promedio razonable. Con menos de
    // BEAT_AVERAGE_MIN_REFERENCE la meta resultante sería trivial o engañosa.
    if (
      tpl.type === 'BEAT_AVERAGE' &&
      userContext.weeklyAverage < BEAT_AVERAGE_MIN_REFERENCE
    ) {
      return false;
    }
    return true;
  });

  if (subset.length === 0) {
    const fallback = getTemplateById(FALLBACK_TEMPLATE_ID);
    if (fallback === null) {
      throw new Error(
        `Catalog corrupt: fallback template '${FALLBACK_TEMPLATE_ID}' not found`,
      );
    }
    return fallback;
  }

  const idx = Math.floor(Math.random() * subset.length);
  const chosen = subset[idx];
  if (chosen === undefined) {
    // Defensivo: con `noUncheckedIndexedAccess`, el acceso indexado puede ser
    // undefined en el tipo aunque jamás lo sea en la práctica aquí.
    throw new Error('Random selection produced undefined index');
  }
  return chosen;
}

// =====================================================================
// Construcción del snapshot del día
// =====================================================================

/** Crea un array de 24 ceros (`stepsByHour` vacío). */
function emptyHourlyBuckets(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

/**
 * Reduce los eventos a buckets por hora local. Cada evento incrementa el
 * bucket correspondiente a `event.timestamp.getHours()` (hora local).
 *
 * Defensivo: si `getHours()` devolviera un valor fuera de [0, 23] (imposible
 * en la práctica con un Date válido), ese evento se descarta.
 */
function bucketizeByHour(events: readonly StepEvent[]): number[] {
  const buckets = emptyHourlyBuckets();
  for (const ev of events) {
    const h = ev.timestamp.getHours();
    if (h < 0 || h > 23) continue;
    const current = buckets[h] ?? 0;
    buckets[h] = current + ev.amount;
  }
  return buckets;
}

/**
 * Construye el snapshot del día para `date` ('YYYY-MM-DD' local):
 * - `totalSteps`: lo lee de `daily_steps` (que el reset de medianoche mantiene).
 *   Si no hay row, 0.
 * - `events`: eventos crudos del simulador en el rango [00:00:00.000, 23:59:59.999].
 *   En producción, cuando exista `PedometerStepSource`, este array vendrá vacío
 *   y los buckets se derivarán de otra fuente; pero la interfaz `DayData` se
 *   mantiene.
 * - `stepsByHour`: buckets de 24 horas derivados de `events`.
 *
 * Caso edge "día sin actividad": devuelve `totalSteps=0`, `events=[]`,
 * `stepsByHour=[0,0,...,0]` (24 ceros). Las misiones evalúan correctamente
 * sobre este input.
 */
export async function buildDayData(date: string): Promise<DayData> {
  const dayDate = parseLocalDate(date);
  const from = getStartOfDay(dayDate);
  const to = getEndOfDay(dayDate);

  const [dailyRecord, events] = await Promise.all([
    getDailySteps(date),
    getSimulatorStepEventsForRange(from, to),
  ]);

  // Para SimulatedStepSource los pasos viven en simulator_steps (events).
  // Para HealthKit/Pedómetro no hay events (tabla vacía) y usamos daily_steps.
  const totalStepsFromEvents = events.reduce((sum, e) => sum + e.amount, 0);
  const totalSteps = totalStepsFromEvents > 0
    ? totalStepsFromEvents
    : (dailyRecord?.steps ?? 0);
  const stepsByHour = bucketizeByHour(events);

  console.log('[buildDayData]', date, 'totalSteps:', totalSteps, 'fromEvents:', totalStepsFromEvents, 'fromDaily:', dailyRecord?.steps ?? 0);

  return {
    date,
    totalSteps,
    stepsByHour,
    events,
  };
}

// =====================================================================
// Evaluación de la misión persistida
// =====================================================================

/**
 * Reconstruye la función `evaluate` a partir de `MissionParams`.
 *
 * IMPORTANTE: aceptamos cierta duplicación lógica respecto a `catalog.ts` para
 * garantizar DETERMINISMO. Los `params` persistidos son la fuente de verdad
 * (no los que generaría `template.generateInstance` HOY, que podrían diferir
 * si `weeklyAverage` cambió, etc.). Recorremos el discriminated union por
 * `params.type` y devolvemos un evaluador puro equivalente al del catálogo.
 *
 * EXPORTADA: la usa `hooks/useDailyMission` para reconstruir la `evaluate` de
 * una `MissionInstance` cargada desde DB (donde solo se persistieron los
 * `params`, no la función). Sin esto, el hook tendría que duplicar la lógica.
 *
 * TODO: si esta duplicación se vuelve costosa, refactorizar `catalog.ts` para
 * exportar un `buildEvaluator(params): (data) => boolean` reutilizable.
 */
export function buildEvaluatorFromParams(
  params: MissionParams,
): (data: DayData) => boolean {
  switch (params.type) {
    case 'TOTAL_STEPS': {
      const { target } = params;
      return (data) => data.totalSteps >= target;
    }
    case 'STEPS_BEFORE_TIME': {
      const { target, hour } = params;
      return (data) => {
        let sum = 0;
        for (let h = 0; h < hour; h++) sum += data.stepsByHour[h] ?? 0;
        return sum >= target;
      };
    }
    case 'STEPS_AFTER_TIME': {
      const { target, hour } = params;
      return (data) => {
        let sum = 0;
        for (let h = hour; h < data.stepsByHour.length; h++) {
          sum += data.stepsByHour[h] ?? 0;
        }
        return sum >= target;
      };
    }
    case 'BEAT_AVERAGE': {
      const { reference } = params;
      return (data) => data.totalSteps > reference;
    }
    case 'CONSECUTIVE_BLOCKS': {
      const { blocks, stepsPerBlock, minMinutesBetween } = params;
      return (data) => {
        let completed = 0;
        let currentSum = 0;
        let lastBlockEnd: Date | null = null;
        for (const ev of data.events) {
          if (lastBlockEnd !== null) {
            const minutesSince =
              (ev.timestamp.getTime() - lastBlockEnd.getTime()) / 60_000;
            if (minutesSince < minMinutesBetween) continue;
            lastBlockEnd = null;
          }
          currentSum += ev.amount;
          if (currentSum >= stepsPerBlock) {
            completed += 1;
            lastBlockEnd = ev.timestamp;
            currentSum = 0;
          }
        }
        return completed >= blocks;
      };
    }
    case 'NO_ZERO_HOURS': {
      const { startHour, endHour } = params;
      return (data) => {
        for (let h = startHour; h <= endHour; h++) {
          if ((data.stepsByHour[h] ?? 0) === 0) return false;
        }
        return true;
      };
    }
    case 'STREAK_PROTECTION': {
      const { maxSteps } = params;
      return (data) => data.totalSteps >= maxSteps;
    }
  }
}

/**
 * Evalúa si la misión PERSISTIDA para `date` ('YYYY-MM-DD' local) se cumple
 * según los datos también persistidos para ese día.
 *
 * Lanza si:
 * - No hay misión persistida para esa fecha (el caller debe generarla antes).
 * - La plantilla referenciada por `templateId` ya no existe en el catálogo.
 *
 * No persiste nada: el caller (`wildcard.ts` o el hook) decide qué hacer con
 * el resultado (marcar completada, consumir comodín, romper streak, etc.).
 */
export async function evaluateMissionForDate(date: string): Promise<boolean> {
  const status = await getMissionForDate(date);
  if (status === null) {
    throw new Error(`No mission for ${date}`);
  }

  // Validamos que la plantilla siga existiendo en el catálogo. Si fue
  // removida en una actualización, preferimos fallar explícitamente a evaluar
  // con datos inconsistentes.
  const template = getTemplateById(status.templateId);
  if (template === null) {
    throw new Error(
      `Template '${status.templateId}' no longer in catalog (date ${date})`,
    );
  }

  const evaluator = buildEvaluatorFromParams(status.params);
  const dayData = await buildDayData(date);
  return evaluator(dayData);
}
