/**
 * useDailyStepReset
 *
 * Reset PROACTIVO del contador diario. Complementa la lógica reactiva de
 * `useStepsToday`: este hook detecta cambios de día (medianoche local) y
 * garantiza que la fila correcta exista en `daily_steps` para "hoy".
 *
 * Estrategia (ver skill step-counter → "Reset de medianoche"):
 * 1. Al montar, compara la fecha local actual contra el último registro de
 *    `daily_steps`. Si difieren (o no hay registro previo), lee el conteo del
 *    día de hoy desde el source y hace `upsertDailySteps(today, ...)`.
 * 2. Listener de `AppState`: re-ejecuta el chequeo al volver a 'active', para
 *    cubrir el caso "el usuario abrió la app, la mandó a background, pasó la
 *    medianoche, volvió". NO usamos `setInterval` (la skill lo prohíbe
 *    explícitamente porque se pierde al cerrar la app).
 *
 * Qué NO hace este hook:
 * - No reconstruye días pasados. Si el usuario no abrió la app durante 3 días,
 *   esos días quedan como estén en SQLite (probablemente sin actualizar). El
 *   fast-forward de N días se evalúa cuando exista `PedometerStepSource`, que
 *   sí puede pedir rangos pasados al sistema.
 * - No actualiza el contador en vivo. De eso se encarga `useStepsToday`.
 * - No emite el conteo al consumidor. Devuelve únicamente metadata útil para
 *   debug/diagnóstico (`lastReset`, `hasResetThisSession`).
 *
 * Errores: los errores de SQLite o del source se logean con `console.warn` y
 * NO se propagan. La UI no debe romperse porque el reset proactivo falle: el
 * peor caso es que `daily_steps` no se actualice esta sesión, lo cual el
 * próximo arranque corregirá.
 *
 * TODO Sprint N (mismo que `useStepsToday`): hardcodeamos `'simulated'` como
 * sourceType porque la factory `getStepSource()` solo devuelve
 * `SimulatedStepSource` por ahora. Cuando exista `PedometerStepSource`, la
 * factory deberá exponer el tipo activo y ambos hooks lo leerán de ahí.
 */

import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getStepSource, type StepSource } from '@/features/steps/sources';
import { formatLocalDate, getStartOfDay } from '@/lib/dates';
import {
  getLastDailyRecord,
  upsertDailySteps,
  type SourceType,
} from '@/lib/db';

// Ver TODO en el bloque de doc del archivo. Centralizamos la constante para
// que el día que cambie el origen quede en un solo punto.
const CURRENT_SOURCE_TYPE: SourceType = 'simulated';

export type UseDailyStepResetResult = {
  /**
   * Timestamp local del último chequeo que detectó un nuevo día y disparó un
   * upsert. `null` si en esta sesión no hubo cambio de día (la fecha del
   * último registro coincidía con hoy).
   */
  lastReset: Date | null;
  /**
   * `true` si en esta sesión el chequeo detectó un cambio de día y reinicializó
   * el registro de hoy en SQLite. Útil para debug y para que la UI muestre un
   * estado "nuevo día" si lo necesita.
   */
  hasResetThisSession: boolean;
};

export function useDailyStepReset(): UseDailyStepResetResult {
  const [lastReset, setLastReset] = useState<Date | null>(null);
  const [hasResetThisSession, setHasResetThisSession] = useState<boolean>(false);

  useEffect(() => {
    const source: StepSource = getStepSource();
    let isMounted = true;

    /**
     * Compara la fecha local de hoy contra el último registro guardado.
     * Si difieren (o no hay registro previo), inicializa la fila de hoy en
     * `daily_steps` leyendo el conteo desde el source.
     *
     * Errores se logean con `console.warn` y se tragan: el siguiente arranque
     * corrige el estado. Aquí preferimos no romper la UI.
     */
    const checkAndReset = async (): Promise<void> => {
      try {
        const now = new Date();
        const today = formatLocalDate(now);
        const lastRecord = await getLastDailyRecord();

        if (!isMounted) return;

        // Mismo día local que el último registro: no hacemos nada. Esto cubre
        // tanto la "segunda apertura del mismo día" como el caso "AppState
        // volvió a 'active' sin que cambiara la fecha".
        if (lastRecord !== null && lastRecord.date === today) {
          return;
        }

        // Día nuevo (o primera apertura): leemos el conteo del día de hoy
        // desde el source. Para `SimulatedStepSource` esto suma los eventos
        // registrados entre 00:00 y ahora; típicamente 0 al arrancar el día.
        const startOfToday = getStartOfDay(now);
        const initialSteps = await source.getStepsForRange(startOfToday, now);

        if (!isMounted) return;

        await upsertDailySteps(today, initialSteps, CURRENT_SOURCE_TYPE);

        if (!isMounted) return;

        setLastReset(new Date());
        setHasResetThisSession(true);
      } catch (error) {
        // No propagamos: el reset proactivo es best-effort. Logueamos para
        // que QA pueda detectar el fallo durante desarrollo.
        console.warn('[useDailyStepReset] checkAndReset failed:', error);
      }
    };

    // 1. Chequeo inicial al montar.
    void checkAndReset();

    // 2. AppState: re-chequear al volver a foreground. Cubre el caso "la app
    //    estuvo en background mientras pasaba la medianoche".
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!isMounted) return;
      if (state === 'active') {
        void checkAndReset();
      }
    });

    return () => {
      isMounted = false;
      appStateSub.remove();
    };
  }, []);

  return {
    lastReset,
    hasResetThisSession,
  };
}
