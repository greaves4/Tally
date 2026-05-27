/**
 * PedometerStepSource — implementación real de `StepSource` usando expo-sensors Pedometer.
 *
 * Usada en builds nativos (iOS / Android) cuando NO se corre en Expo Go.
 * La factory en `./index.ts` decide cuándo inyectar esta clase.
 *
 * Notas de implementación:
 * - `isAvailable` / `requestPermission` / `getPermissionStatus` delegan directamente
 *   a la API de Pedometer. El `PermissionStatus` de expo-modules-core se mapea al
 *   union type de `StepSource.ts`.
 * - `getStepCountAsync` es iOS-only según docs de expo-sensors; en Android la
 *   contabilidad retroactiva se hace vía Health Connect (fuera de alcance).
 * - `watchStepCount` en iOS entrega pasos ACUMULADOS desde el inicio de la suscripción.
 *   Se lleva un contador local para emitir deltas, que es el contrato de `watchSteps`.
 */

import { Pedometer } from 'expo-sensors';

import type { PermissionStatus, SourceKind, StepSource, Subscription } from './StepSource';

function mapPermissionStatus(raw: string): PermissionStatus {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'undetermined';
}

export class PedometerStepSource implements StepSource {
  readonly kind: SourceKind = 'pedometer';

  async isAvailable(): Promise<boolean> {
    return Pedometer.isAvailableAsync();
  }

  async requestPermission(): Promise<PermissionStatus> {
    const result = await Pedometer.requestPermissionsAsync();
    return mapPermissionStatus(String(result.status));
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    const result = await Pedometer.getPermissionsAsync();
    return mapPermissionStatus(String(result.status));
  }

  async getStepsForRange(start: Date, end: Date): Promise<number> {
    const result = await Pedometer.getStepCountAsync(start, end);
    return result.steps;
  }

  /**
   * Suscribe al Pedometer del sistema y emite deltas.
   *
   * iOS entrega pasos acumulados desde el inicio de la suscripción, no deltas.
   * Se trackea `lastCount` para calcular el delta en cada callback y cumplir
   * el contrato de `StepSource.watchSteps` (delta, no acumulado).
   */
  watchSteps(callback: (newSteps: number) => void): Subscription {
    let lastCount = 0;
    const sub = Pedometer.watchStepCount((result) => {
      const delta = result.steps - lastCount;
      lastCount = result.steps;
      if (delta > 0) callback(delta);
    });
    return { remove: () => sub.remove() };
  }
}
