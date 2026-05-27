/**
 * Lógica del comodín semanal y actualización del streak.
 *
 * Ver `/.claude/skills/daily-missions/SKILL.md` → "Lógica del comodín" y
 * "Casos edge". Estas funciones operan sobre la persistencia (`/lib/db.ts`)
 * y orquestan el motor (`./engine`).
 *
 * Reglas clave:
 * - Comodín regenera SOLO los lunes y a lo sumo una vez por lunes (idempotente).
 * - Un día completado normalmente o "salvado" por comodín suma al streak.
 * - Un día fallido SIN comodín disponible rompe el streak a 0.
 * - `processPendingEvaluations` cubre el caso "el usuario abrió la app tras
 *   varios días sin abrirla": evalúa cada día pendiente en orden cronológico.
 */

import {
  getMissionForDate,
  getStreakState,
  markMissionCompleted,
  updateStreakState,
} from '@/lib/db';
import { formatLocalDate, getStartOfDay } from '@/lib/dates';
import { evaluateMissionForDate } from './engine';
import type { StreakState } from './types';

/** Máximo de días retroactivos a evaluar en una sola corrida. */
const MAX_BACKLOG_DAYS = 30;

// =====================================================================
// Helpers
// =====================================================================

/** ¿La fecha cae un lunes en zona horaria local? */
export function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

/**
 * Itera fechas 'YYYY-MM-DD' (local) desde `fromInclusive` hasta `toInclusive`.
 * Si `from > to`, no emite nada.
 */
function* iterateDates(fromInclusive: Date, toInclusive: Date): Generator<string> {
  const cursor = getStartOfDay(fromInclusive);
  const end = getStartOfDay(toInclusive);
  while (cursor.getTime() <= end.getTime()) {
    yield formatLocalDate(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
}

/** Día anterior al `date` dado (zona local). */
function previousDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Suma 1 día a `dateStr` ('YYYY-MM-DD' local) y devuelve la nueva cadena.
 * Usado para arrancar el backlog DESPUÉS del último evaluado.
 */
function dayAfter(dateStr: string): Date {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const date = new Date(y, m - 1, d + 1);
  return date;
}

// =====================================================================
// Comodín
// =====================================================================

/**
 * Si hoy es lunes, regenera el comodín siempre y cuando no se haya regenerado
 * en este mismo lunes. Idempotente: dos llamadas el mismo lunes no duplican.
 *
 * Diseño deliberado: NO regenera comodín si el usuario nunca abrió la app un
 * lunes. La instrucción del producto pide la versión estricta (solo el día
 * lunes). Cambio de comportamiento futuro requiere consenso con producto.
 */
export async function regenerateWildcardIfMonday(): Promise<void> {
  const now = new Date();
  if (!isMonday(now)) return;
  const todayStr = formatLocalDate(now);
  const state = await getStreakState();
  if (state.lastWildcardRegen === todayStr) return;
  await updateStreakState({
    ...state,
    wildcardsAvailable: 1,
    lastWildcardRegen: todayStr,
  });
}

// =====================================================================
// Evaluación + streak
// =====================================================================

export type EvaluateDayResult = {
  /** Streak resultante tras procesar el día. */
  newStreak: number;
  /** ¿Se consumió un comodín para salvar este día? */
  usedWildcard: boolean;
  /** Comodines remanentes tras esta evaluación. */
  wildcardsRemaining: number;
};

/**
 * Procesa la misión de `date` y actualiza el streak en consecuencia.
 *
 * Lógica (ver skill):
 * - Si NO existe misión persistida para esa fecha → no-op total. El usuario
 *   nunca abrió la app ese día y por tanto nunca "jugó". No consume comodín,
 *   no rompe el streak, no suma. La racha solo se ve afectada por días donde
 *   sí hubo misión generada. (Fix Sprint 4 — Bug #4)
 * - Si la misión se cumplió → streak += 1, marca completed (sin comodín).
 * - Si NO se cumplió pero hay comodín → streak += 1, consume comodín,
 *   marca completed (con `usedWildcard=true`).
 * - Si NO se cumplió y no hay comodín → streak = 0, no marca completed.
 *
 * Si la misión existe pero `evaluateMissionForDate` lanza (catálogo cambió,
 * params corruptos), se trata como "no cumplida": pasa por la rama de comodín
 * / break. Distinto del caso "no hay misión" (early-return de arriba).
 */
export async function evaluateDayAndUpdateStreak(
  date: string,
): Promise<EvaluateDayResult> {
  // Bug #4: si no hay misión persistida, NO penalizamos al usuario por no
  // haber abierto la app ese día. Devolvemos el estado actual sin cambios.
  const persisted = await getMissionForDate(date);
  if (persisted === null) {
    const current = await getStreakState();
    return {
      newStreak: current.current,
      usedWildcard: false,
      wildcardsRemaining: current.wildcardsAvailable,
    };
  }

  let completed = false;
  try {
    completed = await evaluateMissionForDate(date);
  } catch (error) {
    // La misión existe pero la evaluación falló (catálogo cambió, params
    // corruptos). Tratamos como no cumplida: consume comodín si hay.
    console.warn('[wildcard] evaluateMissionForDate failed for', date, error);
  }

  const state = await getStreakState();

  if (completed) {
    const newStreak = state.current + 1;
    await markMissionCompleted(date, false);
    await updateStreakState({
      ...state,
      current: newStreak,
      longest: Math.max(state.longest, newStreak),
    });
    return {
      newStreak,
      usedWildcard: false,
      wildcardsRemaining: state.wildcardsAvailable,
    };
  }

  if (state.wildcardsAvailable > 0) {
    const newStreak = state.current + 1;
    const remaining = state.wildcardsAvailable - 1;
    await markMissionCompleted(date, true);
    await updateStreakState({
      ...state,
      current: newStreak,
      longest: Math.max(state.longest, newStreak),
      wildcardsAvailable: remaining,
    });
    return { newStreak, usedWildcard: true, wildcardsRemaining: remaining };
  }

  // Fallo sin comodín: rompe la racha. No marcamos completed.
  await updateStreakState({
    ...state,
    current: 0,
  });
  return { newStreak: 0, usedWildcard: false, wildcardsRemaining: 0 };
}

// =====================================================================
// Backlog de evaluaciones
// =====================================================================

/**
 * Evalúa todos los días pendientes desde `state.lastEvaluatedDate + 1` hasta
 * AYER (hoy aún se está jugando, no se evalúa). En orden cronológico para que
 * el streak refleje correctamente el orden de éxitos/fracasos.
 *
 * Cap defensivo: `MAX_BACKLOG_DAYS` para evitar iterar la historia entera si
 * el usuario abre la app tras meses sin abrirla.
 *
 * Idempotente: una segunda llamada inmediata no hace trabajo (porque
 * `lastEvaluatedDate` ya queda en ayer).
 */
export async function processPendingEvaluations(): Promise<void> {
  const now = new Date();
  const yesterday = previousDay(now);
  const yesterdayStr = formatLocalDate(yesterday);

  const state = await getStreakState();

  // Determinar fecha de inicio del backlog.
  let start: Date;
  if (state.lastEvaluatedDate === null) {
    // Primera evaluación de la historia: empezar hace `MAX_BACKLOG_DAYS` días.
    start = new Date(yesterday);
    start.setDate(start.getDate() - (MAX_BACKLOG_DAYS - 1));
  } else if (state.lastEvaluatedDate >= yesterdayStr) {
    // Ya estamos al día (o más allá). Nada que hacer.
    return;
  } else {
    start = dayAfter(state.lastEvaluatedDate);
    // Cap: si el gap es mayor a MAX_BACKLOG_DAYS, recortamos.
    const earliestAllowed = new Date(yesterday);
    earliestAllowed.setDate(earliestAllowed.getDate() - (MAX_BACKLOG_DAYS - 1));
    if (start.getTime() < earliestAllowed.getTime()) {
      start = earliestAllowed;
    }
  }

  for (const dateStr of iterateDates(start, yesterday)) {
    await evaluateDayAndUpdateStreak(dateStr);
  }

  // Recargar y actualizar la "última fecha evaluada".
  const fresh = await getStreakState();
  await updateStreakState({ ...fresh, lastEvaluatedDate: yesterdayStr });
}

// Re-export del tipo para consumidores
export type { StreakState };
