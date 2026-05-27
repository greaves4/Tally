/**
 * Catálogo curado de plantillas de misiones (13 plantillas, 7 tipos).
 *
 * Cada plantilla expone `generateInstance(date, userContext)` que devuelve una
 * `MissionInstance` con `title`/`description` en español, `params` serializables,
 * y una función `evaluate` pura (no toca DB).
 *
 * Regla absoluta (ver skill daily-missions, sección "Qué NO hacer"):
 * - `evaluate` NO se persiste. Se reconstruye al cargar la misión desde la DB
 *   buscando la plantilla por `templateId` y regenerando la instance con los
 *   mismos `params`. El catálogo es la fuente de verdad de la lógica.
 *
 * Distribución de dificultades:
 * - 1 (fácil):   total-3k, after-9pm-500, protect-1500, protect-2000
 * - 2 (normal):  total-5k, before-noon-2k, after-7pm-1k, blocks-3x500
 * - 3 (medio):   total-8k, before-6pm-5k, beat-average, no-zero-9-18
 * - 4 (difícil): blocks-5x300
 */

import type { DayData, MissionInstance, MissionTemplate } from './types';

// =====================================================================
// Helpers de evaluación (puros)
// =====================================================================

function sumStepsBeforeHour(data: DayData, hour: number): number {
  let sum = 0;
  for (let h = 0; h < hour; h++) {
    sum += data.stepsByHour[h] ?? 0;
  }
  return sum;
}

function sumStepsFromHour(data: DayData, hour: number): number {
  let sum = 0;
  for (let h = hour; h < data.stepsByHour.length; h++) {
    sum += data.stepsByHour[h] ?? 0;
  }
  return sum;
}

/**
 * Evalúa CONSECUTIVE_BLOCKS: recorre los eventos en orden y cuenta cuántos
 * "bloques" se completaron (un bloque = ventana continua de eventos que sumen
 * >= `stepsPerBlock`), exigiendo que entre el final de un bloque y el inicio
 * del siguiente haya al menos `minMinutesBetween` minutos.
 *
 * EXPORTADA: la usa `hooks/useDailyMission` para calcular `progress` de una
 * misión tipo CONSECUTIVE_BLOCKS sin duplicar la lógica. Mantiene la fuente
 * de verdad del cálculo en este archivo.
 */
export function countConsecutiveBlocks(
  data: DayData,
  stepsPerBlock: number,
  minMinutesBetween: number,
): number {
  let blocksCompleted = 0;
  let currentSum = 0;
  let lastBlockEnd: Date | null = null;

  for (const event of data.events) {
    if (lastBlockEnd !== null) {
      const minutesSince =
        (event.timestamp.getTime() - lastBlockEnd.getTime()) / 60_000;
      if (minutesSince < minMinutesBetween) continue;
      lastBlockEnd = null;
    }
    currentSum += event.amount;
    if (currentSum >= stepsPerBlock) {
      blocksCompleted += 1;
      lastBlockEnd = event.timestamp;
      currentSum = 0;
    }
  }
  return blocksCompleted;
}

// =====================================================================
// Builders de instance (factorizan el shape común)
// =====================================================================

function totalStepsInstance(
  templateId: string,
  date: string,
  target: number,
  title: string,
  description: string,
): MissionInstance {
  return {
    templateId,
    date,
    title,
    description,
    params: { type: 'TOTAL_STEPS', target },
    evaluate: (data) => data.totalSteps >= target,
  };
}

function streakProtectionInstance(
  templateId: string,
  date: string,
  minSteps: number,
  title: string,
  description: string,
): MissionInstance {
  return {
    templateId,
    date,
    title,
    description,
    params: { type: 'STREAK_PROTECTION', maxSteps: minSteps },
    evaluate: (data) => data.totalSteps >= minSteps,
  };
}

// =====================================================================
// Plantillas
// =====================================================================

/** TOTAL_STEPS suave: 3.000 pasos. */
const TOTAL_3K: MissionTemplate = {
  id: 'total-3k',
  type: 'TOTAL_STEPS',
  difficulty: 1,
  generateInstance: (date) =>
    totalStepsInstance(
      'total-3k',
      date,
      3000,
      'Camina 3.000 pasos hoy',
      'Una meta tranquila. Mantén movimiento ligero durante el día y la cumples sin pensar.',
    ),
};

/** TOTAL_STEPS normal: 5.000 pasos. */
const TOTAL_5K: MissionTemplate = {
  id: 'total-5k',
  type: 'TOTAL_STEPS',
  difficulty: 2,
  generateInstance: (date) =>
    totalStepsInstance(
      'total-5k',
      date,
      5000,
      'Camina 5.000 pasos hoy',
      'La meta clásica de actividad moderada. Una caminata de 30 minutos te deja muy cerca.',
    ),
};

/** TOTAL_STEPS ambicioso: 8.000 pasos. */
const TOTAL_8K: MissionTemplate = {
  id: 'total-8k',
  type: 'TOTAL_STEPS',
  difficulty: 3,
  generateInstance: (date) =>
    totalStepsInstance(
      'total-8k',
      date,
      8000,
      'Camina 8.000 pasos hoy',
      'Un día activo. Combina movimiento durante el día con una caminata más larga.',
    ),
};

/** STEPS_BEFORE_TIME: 2.000 pasos antes del mediodía. */
const BEFORE_NOON_2K: MissionTemplate = {
  id: 'before-noon-2k',
  type: 'STEPS_BEFORE_TIME',
  difficulty: 2,
  generateInstance: (date) => ({
    templateId: 'before-noon-2k',
    date,
    title: 'Suma 2.000 pasos antes del mediodía',
    description:
      'Empieza el día con movimiento. Una caminata corta de mañana o subir escaleras al llegar a tu destino te alcanzan.',
    params: { type: 'STEPS_BEFORE_TIME', target: 2000, hour: 12 },
    evaluate: (data) => sumStepsBeforeHour(data, 12) >= 2000,
  }),
};

/** STEPS_BEFORE_TIME: 5.000 pasos antes de las 6pm. */
const BEFORE_6PM_5K: MissionTemplate = {
  id: 'before-6pm-5k',
  type: 'STEPS_BEFORE_TIME',
  difficulty: 3,
  generateInstance: (date) => ({
    templateId: 'before-6pm-5k',
    date,
    title: 'Llega a 5.000 pasos antes de las 18:00',
    description:
      'Distribuye la actividad durante la jornada. Para la tarde ya tienes lo grueso resuelto.',
    params: { type: 'STEPS_BEFORE_TIME', target: 5000, hour: 18 },
    evaluate: (data) => sumStepsBeforeHour(data, 18) >= 5000,
  }),
};

/** STEPS_AFTER_TIME: 1.000 pasos después de las 7pm. */
const AFTER_7PM_1K: MissionTemplate = {
  id: 'after-7pm-1k',
  type: 'STEPS_AFTER_TIME',
  difficulty: 2,
  generateInstance: (date) => ({
    templateId: 'after-7pm-1k',
    date,
    title: 'Suma 1.000 pasos después de las 19:00',
    description:
      'Una caminata digestiva al cierre del día. Mejora el descanso y suelta tensión acumulada.',
    params: { type: 'STEPS_AFTER_TIME', target: 1000, hour: 19 },
    evaluate: (data) => sumStepsFromHour(data, 19) >= 1000,
  }),
};

/** STEPS_AFTER_TIME: 500 pasos después de las 9pm (cierre del día). */
const AFTER_9PM_500: MissionTemplate = {
  id: 'after-9pm-500',
  type: 'STEPS_AFTER_TIME',
  difficulty: 1,
  generateInstance: (date) => ({
    templateId: 'after-9pm-500',
    date,
    title: 'Cierra el día con 500 pasos después de las 21:00',
    description:
      'Una vuelta a la manzana antes de dormir. Suficiente para sumar y para despejar la cabeza.',
    params: { type: 'STEPS_AFTER_TIME', target: 500, hour: 21 },
    evaluate: (data) => sumStepsFromHour(data, 21) >= 500,
  }),
};

/**
 * BEAT_AVERAGE: supera tu promedio de los últimos 7 días.
 *
 * Notas:
 * - Snapshotea `weeklyAverage` al momento de generar la instance. Si después
 *   cambia, la misión sigue con el target original (determinismo).
 * - El SELECTOR (engine.selectDailyMission) debe filtrar esta plantilla si
 *   `weeklyAverage` es demasiado bajo (usuario nuevo): la skill recomienda
 *   misiones TOTAL_STEPS fijas los primeros 7 días.
 */
const BEAT_AVERAGE: MissionTemplate = {
  id: 'beat-average',
  type: 'BEAT_AVERAGE',
  difficulty: 3,
  generateInstance: (date, userContext) => {
    const reference = Math.round(userContext.weeklyAverage);
    return {
      templateId: 'beat-average',
      date,
      title: `Supera tu promedio: ${reference.toLocaleString('es-AR')} pasos`,
      description:
        'Tu promedio semanal es la línea base. Hoy va de empujarla un poco para arriba.',
      params: { type: 'BEAT_AVERAGE', reference },
      evaluate: (data) => data.totalSteps > reference,
    };
  },
};

/** CONSECUTIVE_BLOCKS: 3 bloques de 500 pasos con 30+ min entre cada uno. */
const BLOCKS_3X500: MissionTemplate = {
  id: 'blocks-3x500',
  type: 'CONSECUTIVE_BLOCKS',
  difficulty: 2,
  generateInstance: (date) => ({
    templateId: 'blocks-3x500',
    date,
    title: 'Haz 3 bloques de 500 pasos durante el día',
    description:
      'Tres momentos de actividad de al menos 500 pasos, separados por 30 minutos. Movimiento distribuido vence al sedentarismo prolongado.',
    params: {
      type: 'CONSECUTIVE_BLOCKS',
      blocks: 3,
      stepsPerBlock: 500,
      minMinutesBetween: 30,
    },
    evaluate: (data) => countConsecutiveBlocks(data, 500, 30) >= 3,
  }),
};

/** CONSECUTIVE_BLOCKS: 5 bloques de 300 pasos con 60+ min entre cada uno. */
const BLOCKS_5X300: MissionTemplate = {
  id: 'blocks-5x300',
  type: 'CONSECUTIVE_BLOCKS',
  difficulty: 4,
  generateInstance: (date) => ({
    templateId: 'blocks-5x300',
    date,
    title: 'Haz 5 bloques de 300 pasos a lo largo del día',
    description:
      'Cinco micro-pausas activas separadas por al menos una hora. Ideal para días de trabajo de escritorio.',
    params: {
      type: 'CONSECUTIVE_BLOCKS',
      blocks: 5,
      stepsPerBlock: 300,
      minMinutesBetween: 60,
    },
    evaluate: (data) => countConsecutiveBlocks(data, 300, 60) >= 5,
  }),
};

/** NO_ZERO_HOURS: ninguna hora entre 9–18 con 0 pasos. */
const NO_ZERO_9_18: MissionTemplate = {
  id: 'no-zero-9-18',
  type: 'NO_ZERO_HOURS',
  difficulty: 3,
  generateInstance: (date) => ({
    templateId: 'no-zero-9-18',
    date,
    title: 'No pases una hora quieto entre las 9:00 y las 18:00',
    description:
      'Cada hora del horario laboral debe registrar al menos un paso. Levantarte, ir al baño o un café cuenta.',
    params: { type: 'NO_ZERO_HOURS', startHour: 9, endHour: 18 },
    evaluate: (data) => {
      for (let h = 9; h <= 18; h++) {
        if ((data.stepsByHour[h] ?? 0) === 0) return false;
      }
      return true;
    },
  }),
};

/** STREAK_PROTECTION: día tranquilo, basta con 1.500 pasos. */
const PROTECT_1500: MissionTemplate = {
  id: 'protect-1500',
  type: 'STREAK_PROTECTION',
  difficulty: 1,
  generateInstance: (date) =>
    streakProtectionInstance(
      'protect-1500',
      date,
      1500,
      'Día tranquilo: 1.500 pasos',
      'Hoy se vale poco. Camina 1.500 pasos y mantén tu racha viva sin esforzarte.',
    ),
};

/** STREAK_PROTECTION: mantén la racha con 2.000 pasos. */
const PROTECT_2000: MissionTemplate = {
  id: 'protect-2000',
  type: 'STREAK_PROTECTION',
  difficulty: 1,
  generateInstance: (date) =>
    streakProtectionInstance(
      'protect-2000',
      date,
      2000,
      'Mantén la racha: 2.000 pasos',
      'Una meta baja para días ocupados. Cumple y sigue acumulando días consecutivos.',
    ),
};

// =====================================================================
// Catálogo exportado
// =====================================================================

/** Lista completa de plantillas. El motor itera/filtra esto. */
export const MISSION_CATALOG: readonly MissionTemplate[] = [
  TOTAL_3K,
  TOTAL_5K,
  TOTAL_8K,
  BEFORE_NOON_2K,
  BEFORE_6PM_5K,
  AFTER_7PM_1K,
  AFTER_9PM_500,
  BEAT_AVERAGE,
  BLOCKS_3X500,
  BLOCKS_5X300,
  NO_ZERO_9_18,
  PROTECT_1500,
  PROTECT_2000,
];

/**
 * Lookup por id. Devuelve `null` si no existe (defensivo: una misión persistida
 * con `templateId` de una plantilla removida del catálogo no debe crashear).
 */
export function getTemplateById(id: string): MissionTemplate | null {
  return MISSION_CATALOG.find((t) => t.id === id) ?? null;
}
