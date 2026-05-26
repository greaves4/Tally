/**
 * Utilidades de fecha en zona horaria LOCAL del dispositivo.
 *
 * Nunca usamos UTC para determinar "el día actual del usuario": un usuario en CDMX
 * caminando a las 23:30 debe contarse en ese día local, no en el día UTC siguiente.
 *
 * Ver skill step-counter → "Manejo de zona horaria".
 */

/**
 * Formatea una fecha como 'YYYY-MM-DD' en la zona horaria local.
 * Esta es la clave que usamos en la tabla daily_steps de SQLite.
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Devuelve una nueva Date al inicio del día local (00:00:00.000). */
export function getStartOfDay(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Devuelve una nueva Date al final del día local (23:59:59.999). */
export function getEndOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}
