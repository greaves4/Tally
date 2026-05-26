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
