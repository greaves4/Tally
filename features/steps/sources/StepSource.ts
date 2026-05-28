/**
 * Abstracción de la fuente de pasos.
 *
 * Toda la app consume pasos a través de esta interfaz. La factory en `./index.ts`
 * decide qué implementación inyectar (SimulatedStepSource ahora, PedometerStepSource
 * en el futuro). La lógica de negocio (misiones, streak, UI principal) importa solo
 * este archivo — NUNCA una implementación concreta.
 *
 * Ver `/.claude/skills/step-counter/SKILL.md` para el contrato completo.
 */

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Identifica la implementación concreta activa. Usada por la UI (DataSourceIndicator). */
export type SourceKind = 'simulated' | 'pedometer' | 'healthkit';

/**
 * Handle devuelto por `watchSteps`. Llamar a `remove()` desuscribe el callback.
 * Cleanup OBLIGATORIO en el return de `useEffect`.
 */
export type Subscription = {
  remove(): void;
};

export interface StepSource {
  /** Identifica la implementación. Solo para UI; nunca condiciones en lógica de negocio. */
  readonly kind: SourceKind;

  /** ¿Existe esta fuente en el dispositivo actual? */
  isAvailable(): Promise<boolean>;

  /**
   * Pide permiso al usuario (si la fuente lo requiere).
   * No asumas que se concedió: revisa el `PermissionStatus` devuelto.
   */
  requestPermission(): Promise<PermissionStatus>;

  /** Estado actual del permiso sin pedirlo. Útil para mostrar UI explicativa. */
  getPermissionStatus(): Promise<PermissionStatus>;

  /**
   * Total de pasos detectados entre `start` y `end`.
   * Las fechas son `Date` LOCAL del dispositivo (no UTC).
   */
  getStepsForRange(start: Date, end: Date): Promise<number>;

  /**
   * Suscripción a nuevos pasos en tiempo real.
   * El callback recibe la cantidad de pasos NUEVOS desde el último evento (delta),
   * no el total acumulado.
   *
   * Cleanup OBLIGATORIO: llamar a `subscription.remove()` para desuscribirse,
   * típicamente en el return de un `useEffect`.
   */
  watchSteps(callback: (newSteps: number) => void): Subscription;
}
