/**
 * useStepsToday
 *
 * Hook de lectura del contador de pasos del día actual (zona horaria LOCAL).
 *
 * Obtiene la fuente activa vía la factory `getStepSource()` — nunca importa una
 * implementación concreta. La lógica de negocio (UI principal, misiones) consume
 * este hook y permanece agnóstica de si los pasos vienen del simulador o del
 * Pedometer real.
 *
 * Flujo:
 * 1. Se suscribe a `watchSteps` PRIMERO. Los deltas que lleguen mientras una
 *    lectura está en curso se acumulan en un buffer (`pendingDeltas`) en vez de
 *    aplicarse al estado, para evitar una race condition: si `getStepsForRange`
 *    resuelve después de que un delta ya entró pero el SUM de la query no lo
 *    incluyó todavía, sumar el delta al estado y luego sobrescribir con el total
 *    perdería ese delta. Ver Bug #1 en QA Sprint 2.
 * 2. Lectura inicial desde `00:00 local` hasta `now` con `getStepsForRange`.
 *    Cuando resuelve, hace `setStepsToday(total + pendingDeltas)`.
 * 3. Listener de `AppState`: al volver a 'active' re-ejecuta la lectura usando
 *    el mismo patrón "buffer durante la lectura" para cubrir el caso "la app
 *    estuvo en background N horas y posiblemente cambió el día".
 *
 * Edge case — medianoche durante sesión continua:
 * Si la app está abierta y en foreground cuando pasa medianoche, el `useEffect`
 * NO se re-monta y el `startOfToday` capturado al montar queda obsoleto. Los
 * deltas del nuevo día se sumarán al contador del día previo hasta que el
 * usuario mande la app a background y vuelva (lo cual dispara el AppState
 * listener y refresca). Esta inexactitud transitoria es ACEPTABLE para esta
 * versión: el caso real (usuario despierto caminando exactamente en medianoche
 * sin tocar el teléfono) es marginal, y la persistencia de SQLite + el reset
 * proactivo viven en otro lado (ver `hooks/useDailyStepReset` cuando exista).
 * Si en el futuro se requiere precisión absoluta, agregar un timer que se
 * programe para `getStartOfTomorrow() - now` ms y dispare un refresh.
 *
 * Ver `.claude/skills/step-counter/SKILL.md` → "Reset de medianoche" y
 * "Casos edge a manejar siempre".
 */

import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getStepSource, type StepSource, type Subscription } from '@/features/steps/sources';
import { getStartOfDay } from '@/lib/dates';

export type StepSourceType = 'simulated' | 'pedometer';

export type UseStepsTodayResult = {
  /** Pasos del día actual (zona horaria local). 0 mientras `isReady=false`. */
  stepsToday: number;
  /** Tipo de fuente activa. Por ahora siempre 'simulated'. */
  source: StepSourceType;
  /** `true` cuando ya leyó al menos una vez del source. Usar para gating de UI. */
  isReady: boolean;
};

export function useStepsToday(): UseStepsTodayResult {
  const [stepsToday, setStepsToday] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const source: StepSource = getStepSource();
    let isMounted = true;

    // Estado compartido entre `watchSteps` callback y los refreshes:
    // - Mientras `isRefreshing === true`, los deltas se acumulan en
    //   `pendingDeltas` en lugar de aplicarse al estado. Cuando termina la
    //   lectura, se hace `setStepsToday(total + pendingDeltas)` y se resetea.
    // - Mientras `isRefreshing === false`, los deltas se aplican al estado
    //   directamente vía la forma funcional de `setStepsToday`.
    let isRefreshing = false;
    let pendingDeltas = 0;

    /**
     * Ejecuta una lectura de `getStepsForRange` "buffereando" los deltas que
     * lleguen durante la espera. Resuelve la race condition de Bug #1.
     *
     * En el catch respetamos `pendingDeltas`: si la lectura falla no queremos
     * perder los deltas que llegaron durante el intento — los aplicamos al
     * estado anterior.
     */
    const runBufferedRefresh = async (): Promise<void> => {
      isRefreshing = true;
      pendingDeltas = 0;
      const startOfToday = getStartOfDay(new Date());
      try {
        const total = await source.getStepsForRange(startOfToday, new Date());
        if (!isMounted) return;
        const buffered = pendingDeltas;
        setStepsToday(total + buffered);
      } catch (error) {
        // No bloqueamos la UI: en caso de fallo aplicamos los deltas
        // buffereados al estado previo en vez de descartarlos.
        console.warn('[useStepsToday] getStepsForRange failed:', error);
        if (!isMounted) return;
        const buffered = pendingDeltas;
        if (buffered > 0) {
          setStepsToday((prev) => prev + buffered);
        }
      } finally {
        // Salir del modo bufferizado SIEMPRE, incluso si el hook se desmontó
        // (no afecta nada, las variables locales mueren con el closure).
        isRefreshing = false;
        pendingDeltas = 0;
        if (isMounted) setIsReady(true);
      }
    };

    // 1. Suscripción PRIMERO (antes de la lectura inicial). Bug #1: si
    //    suscribiéramos después de iniciar el refresh, un delta entre el inicio
    //    y la resolución se perdería porque el total lo sobrescribiría.
    const subscription: Subscription = source.watchSteps((delta: number) => {
      if (!isMounted) return;
      if (isRefreshing) {
        pendingDeltas += delta;
        return;
      }
      setStepsToday((prev) => prev + delta);
    });

    // 2. Lectura inicial (ya con el buffer activo desde el paso 1).
    void runBufferedRefresh();

    // 3. AppState: al volver a foreground, re-leer con el mismo patrón
    //    buffereado. Bug #2: checkeo `isMounted` al inicio del handler para no
    //    disparar trabajo si el evento llega en el mismo tick del unmount.
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!isMounted) return;
      if (state === 'active') {
        void runBufferedRefresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      appStateSub.remove();
    };
  }, []);

  return {
    stepsToday,
    // TODO Sprint N: leer del Constants/factory cuando exista PedometerStepSource.
    // Por ahora la factory `getStepSource()` siempre devuelve SimulatedStepSource,
    // así que hardcodear 'simulated' es correcto y evita exponer un getter extra
    // en la interfaz `StepSource` solo para esto.
    source: 'simulated',
    isReady,
  };
}
