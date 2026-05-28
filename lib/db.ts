/**
 * Capa de persistencia con expo-sqlite.
 *
 * Responsabilidades:
 * - Abrir (lazy + singleton) la base SQLite local.
 * - Definir el esquema (`daily_steps`, `simulator_steps`) en la inicialización.
 * - Exponer una API tipada y mínima al resto del proyecto.
 *
 * Reglas (ver CLAUDE.md y skill step-counter):
 * - Las fechas del histórico se guardan como 'YYYY-MM-DD' en zona horaria local
 *   del dispositivo (NO UTC). Quien llama es responsable de calcular esa cadena
 *   con `formatLocalDate` de `@/lib/dates`.
 * - El histórico NUNCA se borra. No exponemos un `delete*`.
 * - Los errores de SQLite se propagan: el caller decide qué hacer (mostrar UI
 *   de fallback, reintentar, etc.). Aquí no hay try/catch silenciador.
 */

import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import type {
  MissionParams,
  MissionStatus,
  MissionType,
  StepEvent,
  StreakState,
} from '@/features/missions/types';

// =============================================================================
// Tipos públicos
// =============================================================================

/** Origen del registro de pasos. Determina qué implementación de StepSource lo produjo. */
export type SourceType = 'simulated' | 'pedometer';

/** Un registro diario de pasos, tal como vive en la tabla `daily_steps`. */
export type DailyStepRecord = {
  /** Fecha local del usuario en formato 'YYYY-MM-DD'. */
  date: string;
  /** Total de pasos del día. */
  steps: number;
  /** Fuente que generó el dato. */
  sourceType: SourceType;
  /** ISO timestamp de la última actualización (útil para saber si el dato está fresco). */
  lastUpdated: string;
};

// =============================================================================
// Tipos internos (forma exacta de las filas SQL)
// =============================================================================

/**
 * Forma cruda de una fila de `daily_steps` tal como la devuelve expo-sqlite.
 * Usamos snake_case porque son las columnas SQL; el mapeo a `DailyStepRecord`
 * (camelCase + narrowing de `sourceType`) sucede en `mapDailyRow`.
 */
type DailyStepRow = {
  date: string;
  steps: number;
  source_type: string;
  last_updated: string;
};

/** Forma cruda de la fila resultado de `SUM(amount)`. */
type SumRow = {
  total: number | null;
};

// =============================================================================
// Esquema
// =============================================================================

const DB_NAME = 'stepapp.db';

const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS daily_steps (
    date TEXT PRIMARY KEY,
    steps INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    last_updated TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS simulator_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    amount INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_simulator_timestamp ON simulator_steps(timestamp);

  CREATE TABLE IF NOT EXISTS missions_daily (
    date TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    params TEXT NOT NULL,
    completed INTEGER NOT NULL,
    completed_at TEXT,
    used_wildcard INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS streak_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_streak INTEGER NOT NULL,
    longest_streak INTEGER NOT NULL,
    wildcards_available INTEGER NOT NULL,
    last_wildcard_regen TEXT,
    last_evaluated_date TEXT
  );

  CREATE TABLE IF NOT EXISTS step_debt (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    balance INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL
  );
`;

// =============================================================================
// Singleton de la conexión
// =============================================================================

/**
 * Cache de la promesa de apertura. Cachear la PROMESA (no la DB ya resuelta)
 * resuelve la carrera entre dos `openDb()` casi simultáneos al arranque:
 * ambos llamadores esperan la misma promesa, así abrimos la DB una sola vez.
 *
 * Si la apertura falla, reseteamos la cache para permitir un reintento
 * limpio en una próxima llamada (en lugar de quedar atascados con una
 * promesa rechazada para siempre).
 */
let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Devuelve la instancia (singleton) de la base de datos.
 *
 * En la primera llamada: abre el archivo `stepapp.db`, ejecuta el esquema
 * con `IF NOT EXISTS` (idempotente), y cachea la promesa.
 *
 * En llamadas siguientes: devuelve la misma promesa cacheada.
 *
 * Si la apertura falla, el error se propaga al caller y la cache se limpia.
 */
export function openDb(): Promise<SQLiteDatabase> {
  if (dbPromise !== null) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const db = await openDatabaseAsync(DB_NAME);
    await db.execAsync(SCHEMA_SQL);
    return db;
  })();

  // Si falla la apertura/init, limpiamos la cache para permitir reintento.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

// =============================================================================
// Helpers internos de mapeo
// =============================================================================

/**
 * Narrowing seguro de la columna `source_type` (TEXT en SQLite) al union type.
 * Si la DB devolviera un valor inesperado, lo tratamos como `'simulated'`
 * por defecto (la fuente de desarrollo). Esto evita romper la app con un dato
 * legacy o corrupto, sin recurrir a `as`.
 *
 * En la práctica esto no debería ocurrir, porque solo escribimos valores
 * válidos vía `upsertDailySteps`, pero mantenemos la red de seguridad.
 */
function parseSourceType(raw: string): SourceType {
  if (raw === 'pedometer') return 'pedometer';
  return 'simulated';
}

function mapDailyRow(row: DailyStepRow): DailyStepRecord {
  return {
    date: row.date,
    steps: row.steps,
    sourceType: parseSourceType(row.source_type),
    lastUpdated: row.last_updated,
  };
}

// =============================================================================
// API pública: pasos diarios
// =============================================================================

/**
 * Inserta o actualiza el registro de pasos del día indicado.
 *
 * Usa `ON CONFLICT(date) DO UPDATE` para que la llamada sea idempotente:
 * llamadas repetidas con el mismo `date` simplemente sobrescriben los pasos
 * y la fuente, y refrescan `last_updated`.
 *
 * @param date Fecha local 'YYYY-MM-DD' (usar `formatLocalDate`).
 * @param steps Total de pasos del día (no delta).
 * @param sourceType Fuente que generó el dato.
 */
export async function upsertDailySteps(
  date: string,
  steps: number,
  sourceType: SourceType,
): Promise<void> {
  const db = await openDb();
  const lastUpdated = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO daily_steps (date, steps, source_type, last_updated)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       steps = excluded.steps,
       source_type = excluded.source_type,
       last_updated = excluded.last_updated`,
    [date, steps, sourceType, lastUpdated],
  );
}

/**
 * Devuelve el registro del día indicado, o `null` si no existe.
 * No lanza: la ausencia de registro es un estado válido (primera apertura, etc.).
 */
export async function getDailySteps(date: string): Promise<DailyStepRecord | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<DailyStepRow>(
    `SELECT date, steps, source_type, last_updated
     FROM daily_steps
     WHERE date = ?`,
    [date],
  );

  return row === null ? null : mapDailyRow(row);
}

/**
 * Devuelve los registros entre `from` y `to` inclusive (ambos 'YYYY-MM-DD'),
 * ordenados ascendentemente por fecha.
 *
 * Si no hay registros en el rango, devuelve `[]`.
 */
export async function getStepsRange(
  from: string,
  to: string,
): Promise<DailyStepRecord[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<DailyStepRow>(
    `SELECT date, steps, source_type, last_updated
     FROM daily_steps
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [from, to],
  );

  return rows.map(mapDailyRow);
}

/**
 * Devuelve el registro diario MÁS RECIENTE (mayor `date`), o `null` si la
 * tabla está vacía.
 *
 * Lo usa el hook de reset de medianoche: comparando este `date` con la fecha
 * local actual sabemos si arrancamos un día nuevo.
 */
export async function getLastDailyRecord(): Promise<DailyStepRecord | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<DailyStepRow>(
    `SELECT date, steps, source_type, last_updated
     FROM daily_steps
     ORDER BY date DESC
     LIMIT 1`,
  );

  return row === null ? null : mapDailyRow(row);
}

// =============================================================================
// API pública: simulador (eventos granulares)
// =============================================================================

/**
 * Registra un evento del simulador: una inserción de `amount` pasos en
 * el instante `timestamp`. La granularidad por evento (vs. un contador
 * acumulado) permite responder queries por rango arbitrario, lo que el
 * reset de medianoche y futuras misiones por franja horaria necesitan.
 *
 * El `id` lo asigna SQLite (AUTOINCREMENT). El `timestamp` se serializa
 * como ISO 8601 para que las comparaciones lexicográficas funcionen igual
 * que las cronológicas.
 */
export async function recordSimulatorSteps(
  amount: number,
  timestamp: Date,
): Promise<void> {
  const db = await openDb();
  await db.runAsync(
    `INSERT INTO simulator_steps (timestamp, amount) VALUES (?, ?)`,
    [timestamp.toISOString(), amount],
  );
}

/**
 * Suma todos los `amount` de `simulator_steps` cuyo `timestamp` cae dentro
 * del rango `[from, to]` (inclusive en ambos extremos).
 *
 * Devuelve 0 si no hay eventos en el rango (gracias a `COALESCE`), nunca `null`.
 *
 * Nota: comparamos como strings ISO porque ISO 8601 es lexicográficamente
 * ordenable.
 */
export async function getSimulatorStepsForRange(
  from: Date,
  to: Date,
): Promise<number> {
  const db = await openDb();
  const row = await db.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM simulator_steps
     WHERE timestamp >= ? AND timestamp <= ?`,
    [from.toISOString(), to.toISOString()],
  );

  // `COALESCE` garantiza que `total` no sea null en SQL, pero el tipo
  // permanece `number | null` por seguridad. Normalizamos a 0.
  if (row === null || row.total === null) return 0;
  return row.total;
}

// =============================================================================
// API pública: simulador (eventos crudos para análisis por hora / bloques)
// =============================================================================

/** Forma cruda de una fila de `simulator_steps`. */
type SimulatorStepRow = {
  timestamp: string;
  amount: number;
};

/**
 * Devuelve los eventos crudos del simulador en el rango `[from, to]`,
 * ordenados ascendentemente por timestamp.
 *
 * A diferencia de `getSimulatorStepsForRange` (que suma todo), aquí devolvemos
 * los eventos individuales. Lo necesita el motor de misiones para construir
 * `stepsByHour` y evaluar misiones tipo CONSECUTIVE_BLOCKS o NO_ZERO_HOURS.
 *
 * Si no hay eventos en el rango, devuelve `[]`.
 */
export async function getSimulatorStepEventsForRange(
  from: Date,
  to: Date,
): Promise<StepEvent[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<SimulatorStepRow>(
    `SELECT timestamp, amount
     FROM simulator_steps
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp ASC`,
    [from.toISOString(), to.toISOString()],
  );

  return rows.map((row) => ({
    timestamp: new Date(row.timestamp),
    amount: row.amount,
  }));
}

// =============================================================================
// Tipos internos: misiones y streak
// =============================================================================

/**
 * Forma cruda de una fila de `missions_daily`. Los enteros booleanos llegan
 * como `number` (0/1); `params` viene como string JSON serializado.
 */
type MissionRow = {
  date: string;
  template_id: string;
  title: string;
  description: string;
  params: string;
  completed: number;
  completed_at: string | null;
  used_wildcard: number;
};

/** Forma cruda de la fila singleton de `streak_state` (id=1). */
type StreakRow = {
  id: number;
  current_streak: number;
  longest_streak: number;
  wildcards_available: number;
  last_wildcard_regen: string | null;
  last_evaluated_date: string | null;
};

/** Forma cruda al hacer SELECT template_id. */
type TemplateIdRow = {
  template_id: string;
};

// =============================================================================
// Type guards: validación defensiva de `params` parseado desde JSON
// =============================================================================

const VALID_MISSION_TYPES: ReadonlySet<MissionType> = new Set<MissionType>([
  'TOTAL_STEPS',
  'STEPS_BEFORE_TIME',
  'STEPS_AFTER_TIME',
  'BEAT_AVERAGE',
  'CONSECUTIVE_BLOCKS',
  'NO_ZERO_HOURS',
  'STREAK_PROTECTION',
]);

function isMissionType(value: unknown): value is MissionType {
  return (
    typeof value === 'string' && VALID_MISSION_TYPES.has(value as MissionType)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Valida un `unknown` (típicamente resultado de `JSON.parse`) y lo narrowea
 * a `MissionParams`. Devuelve `null` si la forma no calza con ninguno de los
 * variantes del discriminated union.
 *
 * Estricto a propósito: si el JSON está corrupto o pertenece a una versión
 * vieja del esquema, preferimos descartar la misión a propagar un valor mal
 * formado al resto del sistema.
 */
function parseMissionParams(value: unknown): MissionParams | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  if (!isMissionType(type)) return null;

  switch (type) {
    case 'TOTAL_STEPS': {
      if (!isFiniteNumber(obj.target)) return null;
      return { type, target: obj.target };
    }
    case 'STEPS_BEFORE_TIME':
    case 'STEPS_AFTER_TIME': {
      if (!isFiniteNumber(obj.target) || !isFiniteNumber(obj.hour)) return null;
      return { type, target: obj.target, hour: obj.hour };
    }
    case 'BEAT_AVERAGE': {
      if (!isFiniteNumber(obj.reference)) return null;
      return { type, reference: obj.reference };
    }
    case 'CONSECUTIVE_BLOCKS': {
      if (
        !isFiniteNumber(obj.blocks) ||
        !isFiniteNumber(obj.stepsPerBlock) ||
        !isFiniteNumber(obj.minMinutesBetween)
      ) {
        return null;
      }
      return {
        type,
        blocks: obj.blocks,
        stepsPerBlock: obj.stepsPerBlock,
        minMinutesBetween: obj.minMinutesBetween,
      };
    }
    case 'NO_ZERO_HOURS': {
      if (!isFiniteNumber(obj.startHour) || !isFiniteNumber(obj.endHour)) {
        return null;
      }
      return { type, startHour: obj.startHour, endHour: obj.endHour };
    }
    case 'STREAK_PROTECTION': {
      if (!isFiniteNumber(obj.maxSteps)) return null;
      return { type, maxSteps: obj.maxSteps };
    }
  }
}

// =============================================================================
// Helpers internos de mapeo: misiones y streak
// =============================================================================

/**
 * Mapea una `MissionRow` a `MissionStatus`. Devuelve `null` si `params` no
 * puede parsearse como JSON válido o si la forma resultante no es un
 * `MissionParams` reconocido. Los callers ya tratan `null` como "no hay
 * misión" — esto es consistente con datos corruptos: ignoramos la misión.
 */
function mapMissionRow(row: MissionRow): MissionStatus | null {
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(row.params);
  } catch {
    // Logger temporal: TODO migrar a `lib/logger.ts` cuando exista.
    console.warn(
      `[db] mission ${row.date}: params no es JSON válido, ignorando misión`,
    );
    return null;
  }

  const params = parseMissionParams(parsedUnknown);
  if (params === null) {
    console.warn(
      `[db] mission ${row.date}: forma de params no reconocida, ignorando misión`,
    );
    return null;
  }

  return {
    date: row.date,
    templateId: row.template_id,
    title: row.title,
    description: row.description,
    params,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    usedWildcard: row.used_wildcard === 1,
  };
}

function mapStreakRow(row: StreakRow): StreakState {
  return {
    current: row.current_streak,
    longest: row.longest_streak,
    wildcardsAvailable: row.wildcards_available,
    lastWildcardRegen: row.last_wildcard_regen,
    lastEvaluatedDate: row.last_evaluated_date,
  };
}

// =============================================================================
// API pública: misiones diarias
// =============================================================================

/**
 * Devuelve la misión persistida para la fecha indicada (`'YYYY-MM-DD'`).
 *
 * Devuelve `null` si:
 * - No hay row para esa fecha.
 * - `params` está corrupto (JSON inválido o forma desconocida). En ese caso
 *   loggea un warning. El caller suele tratar "null" como "regenerar misión".
 */
export async function getMissionForDate(
  date: string,
): Promise<MissionStatus | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<MissionRow>(
    `SELECT date, template_id, title, description, params,
            completed, completed_at, used_wildcard
     FROM missions_daily
     WHERE date = ?`,
    [date],
  );

  return row === null ? null : mapMissionRow(row);
}

/**
 * Inserta o actualiza la misión del día. Idempotente: llamar dos veces con
 * el mismo `date` sobrescribe los campos.
 *
 * `params` se serializa a JSON. Los flags booleanos se persisten como 0/1.
 */
export async function upsertMission(record: MissionStatus): Promise<void> {
  const db = await openDb();
  const paramsJson = JSON.stringify(record.params);

  await db.runAsync(
    `INSERT INTO missions_daily (
       date, template_id, title, description, params,
       completed, completed_at, used_wildcard
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       template_id = excluded.template_id,
       title = excluded.title,
       description = excluded.description,
       params = excluded.params,
       completed = excluded.completed,
       completed_at = excluded.completed_at,
       used_wildcard = excluded.used_wildcard`,
    [
      record.date,
      record.templateId,
      record.title,
      record.description,
      paramsJson,
      record.completed ? 1 : 0,
      record.completedAt,
      record.usedWildcard ? 1 : 0,
    ],
  );
}

/**
 * Marca como completada la misión del `date` indicado, sin tocar el resto de
 * campos (template_id, title, params, etc.). Establece `completed_at` al
 * instante actual en ISO 8601.
 *
 * Si no existe row para esa fecha, el UPDATE no afecta filas — silenciosamente.
 * El caller es responsable de garantizar que la misión exista antes (lo
 * normal es haberla generado con `upsertMission` el mismo día).
 */
export async function markMissionCompleted(
  date: string,
  usedWildcard: boolean,
): Promise<void> {
  const db = await openDb();
  const completedAt = new Date().toISOString();

  await db.runAsync(
    `UPDATE missions_daily
     SET completed = 1,
         completed_at = ?,
         used_wildcard = ?
     WHERE date = ?`,
    [completedAt, usedWildcard ? 1 : 0, date],
  );
}

/**
 * Devuelve los `template_id` de las misiones registradas en fechas
 * estrictamente anteriores a `beforeDate`, ordenados de más reciente a más
 * vieja, con un máximo de `limit` resultados.
 *
 * Lo usa el selector para excluir las plantillas recientemente usadas y
 * forzar variedad.
 */
export async function getRecentMissionIds(
  beforeDate: string,
  limit: number,
): Promise<string[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<TemplateIdRow>(
    `SELECT template_id
     FROM missions_daily
     WHERE date < ?
     ORDER BY date DESC
     LIMIT ?`,
    [beforeDate, limit],
  );

  return rows.map((r) => r.template_id);
}

// =============================================================================
// API pública: streak (singleton row con id=1)
// =============================================================================

/** Estado inicial usado en el seed si la tabla está vacía. */
const STREAK_INITIAL: StreakState = {
  current: 0,
  longest: 0,
  wildcardsAvailable: 0,
  lastWildcardRegen: null,
  lastEvaluatedDate: null,
};

/**
 * Devuelve el estado del streak (siempre la row `id=1`).
 *
 * Si la tabla está vacía (primer arranque del usuario), hace SEED LAZY:
 * inserta una row con valores iniciales en cero/null y la devuelve. Idempotente:
 * llamadas siguientes encuentran el row y simplemente lo devuelven.
 */
export async function getStreakState(): Promise<StreakState> {
  const db = await openDb();
  const row = await db.getFirstAsync<StreakRow>(
    `SELECT id, current_streak, longest_streak,
            wildcards_available, last_wildcard_regen, last_evaluated_date
     FROM streak_state
     WHERE id = 1`,
  );

  if (row !== null) {
    return mapStreakRow(row);
  }

  // Seed lazy: la tabla está vacía. Insertamos la row inicial.
  await db.runAsync(
    `INSERT INTO streak_state (
       id, current_streak, longest_streak,
       wildcards_available, last_wildcard_regen, last_evaluated_date
     ) VALUES (1, ?, ?, ?, ?, ?)`,
    [
      STREAK_INITIAL.current,
      STREAK_INITIAL.longest,
      STREAK_INITIAL.wildcardsAvailable,
      STREAK_INITIAL.lastWildcardRegen,
      STREAK_INITIAL.lastEvaluatedDate,
    ],
  );

  return STREAK_INITIAL;
}

// =============================================================================
// Tipos internos: deuda de pasos
// =============================================================================

type StepDebtRow = {
  id: number;
  balance: number;
  last_updated: string;
};

/**
 * Actualiza el estado del streak. Hace upsert sobre la row `id=1`: si por
 * algún motivo no existiera (no debería tras `getStreakState`), se crea.
 */
export async function updateStreakState(state: StreakState): Promise<void> {
  const db = await openDb();

  await db.runAsync(
    `INSERT INTO streak_state (
       id, current_streak, longest_streak,
       wildcards_available, last_wildcard_regen, last_evaluated_date
     ) VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_streak = excluded.current_streak,
       longest_streak = excluded.longest_streak,
       wildcards_available = excluded.wildcards_available,
       last_wildcard_regen = excluded.last_wildcard_regen,
       last_evaluated_date = excluded.last_evaluated_date`,
    [
      state.current,
      state.longest,
      state.wildcardsAvailable,
      state.lastWildcardRegen,
      state.lastEvaluatedDate,
    ],
  );
}

// =============================================================================
// API pública: deuda de pasos (singleton row con id=1)
// =============================================================================

/**
 * Devuelve el balance acumulado de pasos, o `null` si nunca se ha calculado
 * (primera instalación, sin días completados todavía).
 */
export async function getStepDebt(): Promise<{ balance: number; lastUpdated: string } | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<StepDebtRow>(
    `SELECT id, balance, last_updated FROM step_debt WHERE id = 1`,
  );
  if (row === null) return null;
  return { balance: row.balance, lastUpdated: row.last_updated };
}

/**
 * Inserta o actualiza el balance acumulado. Idempotente sobre `id=1`.
 *
 * @param balance Nuevo balance (positivo = crédito, negativo = deuda).
 * @param date Fecha local 'YYYY-MM-DD' del último cálculo (usar `formatLocalDate`).
 */
export async function upsertStepDebt(balance: number, date: string): Promise<void> {
  const db = await openDb();
  await db.runAsync(
    `INSERT INTO step_debt (id, balance, last_updated)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       balance = excluded.balance,
       last_updated = excluded.last_updated`,
    [balance, date],
  );
}
