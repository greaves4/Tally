/**
 * SimulatedStepSource — implementación de `StepSource` para desarrollo y demo.
 *
 * Genera pasos sintéticos persistidos en la tabla `simulator_steps` de SQLite
 * (vía `lib/db`). Permite agregar pasos manualmente desde el panel de debug
 * o de forma periódica con el modo auto-walking.
 *
 * Decisiones de diseño relevantes:
 * - Implementa la interfaz `StepSource` completa: la lógica de negocio NUNCA
 *   debe importar esta clase directamente, solo a través de la factory
 *   (ver `./index.ts`, paso pendiente).
 * - Los métodos extra (`addSteps`, `startAutoWalk`, `stopAutoWalk`) son
 *   específicos del simulador y los consume únicamente el panel de debug.
 * - El callback de `watchSteps` recibe DELTAS (pasos nuevos), no el total
 *   acumulado — esto coincide con el contrato documentado en `StepSource.ts`.
 *
 * Ver `/.claude/skills/step-simulator/SKILL.md` para el contexto completo.
 */

import {
  getSimulatorStepsForRange,
  recordSimulatorSteps,
  deleteSimulatorStepsSince,
} from '@/lib/db';
import type {
  PermissionStatus,
  StepSource,
  Subscription,
} from './StepSource';

/**
 * Tipo del handle devuelto por `setInterval` en React Native.
 *
 * Usamos `ReturnType<typeof setInterval>` en lugar de `NodeJS.Timeout` porque
 * este último solo existe cuando los tipos de Node están cargados, y RN tiene
 * su propio retorno (en runtime es `number` en algunas plataformas, en otras
 * un objeto). Esta forma es portable y satisface `noUncheckedIndexedAccess`.
 */
type IntervalHandle = ReturnType<typeof setInterval>;

type StepListener = (newSteps: number) => void;

export class SimulatedStepSource implements StepSource {
  readonly kind = 'simulated' as const;

  private readonly listeners: Set<StepListener> = new Set();
  private autoWalkInterval: IntervalHandle | null = null;

  // ===========================================================================
  // Interfaz StepSource
  // ===========================================================================

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async requestPermission(): Promise<PermissionStatus> {
    return 'granted';
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return 'granted';
  }

  async getStepsForRange(start: Date, end: Date): Promise<number> {
    return getSimulatorStepsForRange(start, end);
  }

  /**
   * Suscribe un callback que recibirá los DELTAS de pasos generados
   * (manual o por auto-walk). El handle devuelto es idempotente:
   * llamar `remove()` dos veces no lanza ni produce efectos extra,
   * porque `Set.delete` devuelve `false` silenciosamente si el item ya no está.
   */
  watchSteps(callback: StepListener): Subscription {
    this.listeners.add(callback);
    return {
      remove: () => {
        this.listeners.delete(callback);
      },
    };
  }

  // ===========================================================================
  // Métodos públicos extra (específicos del simulador, NO en la interfaz)
  // ===========================================================================

  /**
   * Agrega `amount` pasos al simulador, persistidos con timestamp `now`.
   *
   * Política de error: si la escritura en SQLite falla, NO crasheamos ni
   * notificamos a los listeners — porque el dato no quedó persistido,
   * notificar generaría inconsistencia entre lo que la UI mostró y lo que
   * `getStepsForRange` devolverá después. Se loggea con `console.warn`
   * para no perder la señal en desarrollo.
   *
   * (En el futuro, cuando exista `lib/logger.ts`, migrar este warn allí.)
   */
  async addSteps(amount: number): Promise<void> {
    try {
      await recordSimulatorSteps(amount, new Date());
    } catch (error) {
      console.warn(
        '[SimulatedStepSource] recordSimulatorSteps falló; no se notifica a listeners.',
        error,
      );
      return;
    }
    this.notifyListeners(amount);
  }

  /**
   * Inicia el modo auto-walking: agrega `stepsPerTick` cada `intervalMs`.
   *
   * Si ya había un auto-walk activo, lo detiene antes para evitar dos
   * intervals corriendo en paralelo (lo que duplicaría los pasos).
   *
   * `addSteps` es async; no esperamos su promesa dentro del tick (no
   * tiene sentido bloquear el interval), pero capturamos los rechazos
   * para evitar `UnhandledPromiseRejection` en RN.
   */
  startAutoWalk(stepsPerTick: number, intervalMs: number): void {
    this.stopAutoWalk();
    this.autoWalkInterval = setInterval(() => {
      this.addSteps(stepsPerTick).catch((error: unknown) => {
        console.warn('[SimulatedStepSource] addSteps en auto-walk falló.', error);
      });
    }, intervalMs);
  }

  /**
   * Borra todos los pasos registrados desde `startOfDay` y notifica a los
   * listeners con un delta negativo igual al total eliminado, de modo que
   * `useStepsToday` actualice su estado a 0 sin necesidad de re-montar.
   */
  async resetTodaySteps(startOfDay: Date): Promise<void> {
    const total = await getSimulatorStepsForRange(startOfDay, new Date());
    await deleteSimulatorStepsSince(startOfDay);
    if (total > 0) {
      this.notifyListeners(-total);
    }
  }

  /**
   * Detiene el modo auto-walking si estaba activo.
   * Llamarlo sin auto-walk activo es un no-op.
   */
  stopAutoWalk(): void {
    if (this.autoWalkInterval !== null) {
      clearInterval(this.autoWalkInterval);
      this.autoWalkInterval = null;
    }
  }

  // ===========================================================================
  // Internos
  // ===========================================================================

  /**
   * Notifica a todos los listeners el delta de pasos generado.
   *
   * Iteramos sobre una COPIA del Set para que:
   * - Si un listener se desuscribe a sí mismo durante la notificación,
   *   no haya concurrent-modification del Set en medio de la iteración.
   * - Si un listener lanza, los demás listeners igual reciben el evento;
   *   el error se silencia con `console.warn` (no debe propagarse a
   *   quien llama a `addSteps`).
   */
  private notifyListeners(newSteps: number): void {
    const snapshot = Array.from(this.listeners);
    for (const listener of snapshot) {
      try {
        listener(newSteps);
      } catch (error) {
        console.warn('[SimulatedStepSource] listener lanzó un error.', error);
      }
    }
  }
}
