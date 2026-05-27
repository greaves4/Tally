/**
 * Tipos del dominio de misiones diarias.
 *
 * Ver `/.claude/skills/daily-missions/SKILL.md` para la filosofía y los
 * casos edge. Estos tipos son la fuente de verdad para todo lo relacionado
 * con catálogo, motor, persistencia y UI de misiones.
 */

// =====================================================================
// Tipos de misión y dificultad
// =====================================================================

export type MissionType =
  | 'TOTAL_STEPS'
  | 'STEPS_BEFORE_TIME'
  | 'STEPS_AFTER_TIME'
  | 'BEAT_AVERAGE'
  | 'CONSECUTIVE_BLOCKS'
  | 'NO_ZERO_HOURS'
  | 'STREAK_PROTECTION';

export type MissionDifficulty = 1 | 2 | 3 | 4 | 5;

// =====================================================================
// Datos del día (input de la función `evaluate`)
// =====================================================================

/** Un evento de pasos puntual (de simulator_steps o futuro pedometer). */
export type StepEvent = {
  /** Timestamp del evento. */
  timestamp: Date;
  /** Cantidad de pasos en ese evento. */
  amount: number;
};

/**
 * Snapshot de los datos del día, ya pre-armado por el motor.
 * La función `evaluate` recibe esto y es PURA — no debe tocar DB.
 */
export type DayData = {
  /** Fecha local 'YYYY-MM-DD'. */
  date: string;
  /** Suma total de pasos del día. */
  totalSteps: number;
  /** Array de 24 posiciones (0–23) con la suma de pasos por hora local. */
  stepsByHour: number[];
  /** Eventos individuales ordenados ascendente por `timestamp`. */
  events: StepEvent[];
};

// =====================================================================
// Parámetros por tipo de misión (discriminados por `type`)
// =====================================================================

/**
 * Discriminated union: `params.type` permite a TypeScript narrowear el
 * resto de campos sin casts. Serializable a JSON 1:1 (sin Dates, funciones).
 */
export type MissionParams =
  | { type: 'TOTAL_STEPS'; target: number }
  | { type: 'STEPS_BEFORE_TIME'; target: number; hour: number }
  | { type: 'STEPS_AFTER_TIME'; target: number; hour: number }
  | { type: 'BEAT_AVERAGE'; reference: number }
  | {
      type: 'CONSECUTIVE_BLOCKS';
      blocks: number;
      stepsPerBlock: number;
      minMinutesBetween: number;
    }
  | { type: 'NO_ZERO_HOURS'; startHour: number; endHour: number }
  | { type: 'STREAK_PROTECTION'; maxSteps: number };

// =====================================================================
// Contexto del usuario (input del selector y los generators)
// =====================================================================

export type UserContext = {
  /** Promedio de pasos de los últimos 7 días con datos. 0 si no hay datos. */
  weeklyAverage: number;
  /** IDs de plantillas usadas en los últimos 7 días (más recientes primero). */
  recentMissionIds: string[];
  /** Streak actual para calibrar dificultad disponible. */
  currentStreak: number;
};

// =====================================================================
// Catálogo: plantillas e instancias
// =====================================================================

/** Instancia concreta de una misión para un día específico. */
export type MissionInstance = {
  /** ID de la plantilla del catálogo que la generó. */
  templateId: string;
  /** Fecha local 'YYYY-MM-DD' para la que aplica. */
  date: string;
  /** Copy mostrado al usuario. En español, ya con valores concretos. */
  title: string;
  /** Descripción larga; usada en MissionCard y pantalla de detalles. */
  description: string;
  /** Parámetros concretos del día. Serializable a JSON. */
  params: MissionParams;
  /**
   * Evaluación pura. NO se persiste: se reconstruye desde `templateId + params`
   * al cargar la misión desde la DB. Ver `engine.evaluateMissionForDate`.
   */
  evaluate: (data: DayData) => boolean;
};

/**
 * Plantilla del catálogo. `generateInstance` produce una `MissionInstance`
 * concreta combinando una fecha y el contexto del usuario.
 */
export type MissionTemplate = {
  /** ID único y descriptivo (ej: 'total-5k'). */
  id: string;
  /** Tipo de misión. */
  type: MissionType;
  /** Dificultad calibrada (1 fácil, 5 muy difícil). */
  difficulty: MissionDifficulty;
  /**
   * Genera la instancia del día. Es PURA: dado mismo input, mismo output
   * (excepto si la plantilla introduce aleatoriedad explícita).
   */
  generateInstance: (date: string, userContext: UserContext) => MissionInstance;
};

// =====================================================================
// Persistencia
// =====================================================================

/** Row de `missions_daily` mapeado al dominio. */
export type MissionStatus = {
  /** Fecha local 'YYYY-MM-DD'. */
  date: string;
  /** ID de la plantilla que la generó. */
  templateId: string;
  /** Copy guardado al momento de generar (no se regenera). */
  title: string;
  /** Descripción guardada al momento de generar. */
  description: string;
  /** Params parsed desde JSON. */
  params: MissionParams;
  /** ¿Está marcada como completada? Incluye casos con comodín. */
  completed: boolean;
  /** ISO timestamp de cuándo se completó. `null` si no se evaluó / no se cumplió. */
  completedAt: string | null;
  /** ¿La marca de "completada" usó el comodín semanal? */
  usedWildcard: boolean;
};

/** Estado global del streak (singleton row con `id = 1`). */
export type StreakState = {
  /** Días consecutivos cumplidos (incluyendo días salvados por comodín). */
  current: number;
  /** Mayor racha histórica. */
  longest: number;
  /** Comodines disponibles para usar (0 o 1). Regenera cada lunes. */
  wildcardsAvailable: number;
  /** Fecha 'YYYY-MM-DD' del lunes que generó el comodín actual. `null` si nunca. */
  lastWildcardRegen: string | null;
  /** Última fecha evaluada por `processPendingEvaluations`. `null` si nunca. */
  lastEvaluatedDate: string | null;
};
