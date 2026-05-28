/**
 * Factory de StepSource.
 *
 * `getStepSource()` es la ÚNICA forma de obtener una instancia. Lógica de negocio,
 * hooks, y UI deben pasar por aquí — nunca instanciar `SimulatedStepSource` ni
 * `PedometerStepSource` directamente.
 *
 * Singleton: la primera invocación crea la instancia, siguientes devuelven la misma.
 *
 * Lógica de selección:
 * - Expo Go (ver `isExpoGo`): siempre SimulatedStepSource. El Pedometer no está
 *   disponible de forma fiable en Expo Go y el simulador de iOS no tiene sensores reales.
 * - Build nativo iOS/Android: PedometerStepSource (acceso al sensor real del dispositivo).
 * - Otras plataformas (web, etc.): SimulatedStepSource como fallback seguro.
 */

import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';

import { PedometerStepSource } from './PedometerStepSource';
import { SimulatedStepSource } from './SimulatedStepSource';
import type { StepSource } from './StepSource';

export type { StepSource, PermissionStatus, Subscription, SourceKind } from './StepSource';
export { SimulatedStepSource } from './SimulatedStepSource';

let instance: StepSource | null = null;

/**
 * ¿Debemos usar el simulador en lugar del Pedómetro?
 *
 * - `__DEV__` es `true` en Expo Go y en cualquier build de desarrollo; es la
 *   señal más fiable en SDK 54 con expo-dev-client instalado, donde
 *   `Constants.appOwnership` puede devolver `null` incluso dentro de Expo Go.
 * - `appOwnership === 'expo'` se mantiene como respaldo para el caso en que
 *   `__DEV__` no esté disponible en algún entorno de CI/build exótico.
 */
function isExpoGo(): boolean {
  return __DEV__ || Constants.appOwnership === AppOwnership.Expo;
}

function createStepSource(): StepSource {
  // Expo Go: siempre simulador. Cubre iOS Simulator + Expo Go en dispositivo físico.
  if (isExpoGo()) {
    return new SimulatedStepSource();
  }
  // Build nativo iOS: HealthKit tiene prioridad (acceso completo al historial del día).
  // require() lazy para evitar que el módulo nativo se evalúe en Expo Go.
  if (Platform.OS === 'ios') {
    try {
      console.log('[Factory] attempting HealthKit');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./HealthKitStepSource') as typeof import('./HealthKitStepSource');
      return new mod.HealthKitStepSource();
    } catch (error) {
      console.log('[Factory] HealthKit error:', error);
      return new PedometerStepSource();
    }
  }
  // Build nativo Android: Pedómetro (HealthKit no existe en Android).
  if (Platform.OS === 'android') {
    return new PedometerStepSource();
  }
  return new SimulatedStepSource();
}

export function getStepSource(): StepSource {
  if (instance === null) {
    instance = createStepSource();
    console.log('[StepSource] appOwnership:', Constants.appOwnership);
    console.log('[StepSource] kind:', instance.kind);
  }
  return instance;
}

/**
 * Tipo del singleton para casos donde se necesita el shape concreto (ej:
 * el panel del simulador que llama a `addSteps`). Quien usa este tipo se
 * compromete a hacer un cast explícito y solo es válido cuando la factory
 * devuelve `SimulatedStepSource` (Expo Go / entorno de desarrollo).
 */
export type StepSourceInstance = SimulatedStepSource;
