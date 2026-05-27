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
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';

import { PedometerStepSource } from './PedometerStepSource';
import { SimulatedStepSource } from './SimulatedStepSource';
import type { StepSource } from './StepSource';

export type { StepSource, PermissionStatus, Subscription, SourceKind } from './StepSource';
export { SimulatedStepSource } from './SimulatedStepSource';

let instance: StepSource | null = null;

/**
 * ¿Estamos corriendo dentro de Expo Go?
 *
 * Combina las dos señales disponibles porque ninguna es suficiente por sí sola
 * en este proyecto (SDK 54 con `expo-dev-client` instalado):
 * - `executionEnvironment === StoreClient` es la API "moderna", pero con un
 *   dev-client en el árbol puede reportar `bare`/`undefined` en Expo Go, lo que
 *   hacía caer la selección al Pedometer y crasheaba el panel del simulador.
 * - `appOwnership === 'expo'` está deprecado pero sigue siendo el indicador
 *   fiable y específico de Expo Go (es el que usaba el diseño original).
 *
 * Con OR, basta que CUALQUIERA detecte Expo Go para usar el simulador, que es
 * el lado seguro: nunca intentamos leer un sensor que no existe.
 */
function isExpoGo(): boolean {
  return (
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function createStepSource(): StepSource {
  // Expo Go: siempre simulador. Cubre iOS Simulator + Expo Go en dispositivo físico.
  if (isExpoGo()) {
    return new SimulatedStepSource();
  }
  // Build nativo en iOS o Android: usar el Pedómetro real del dispositivo.
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return new PedometerStepSource();
  }
  return new SimulatedStepSource();
}

export function getStepSource(): StepSource {
  if (instance === null) {
    instance = createStepSource();
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
