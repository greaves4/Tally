/**
 * Factory de StepSource.
 *
 * `getStepSource()` es la ÚNICA forma de obtener una instancia. Lógica de negocio,
 * hooks, y UI deben pasar por aquí — nunca instanciar `SimulatedStepSource` ni
 * `PedometerStepSource` directamente.
 *
 * Singleton: la primera invocación crea la instancia, siguientes devuelven la misma.
 *
 * En esta versión, SIEMPRE devuelve `SimulatedStepSource`. Cuando se active Apple
 * Developer Program y se haga build físico, este archivo es el único punto donde
 * se decide qué implementación inyectar.
 */

import { SimulatedStepSource } from './SimulatedStepSource';
import type { StepSource } from './StepSource';

export type { StepSource, PermissionStatus, Subscription } from './StepSource';
export { SimulatedStepSource } from './SimulatedStepSource';

let instance: StepSource | null = null;

export function getStepSource(): StepSource {
  if (instance === null) {
    instance = new SimulatedStepSource();
  }
  return instance;
}

/**
 * Tipo del singleton para casos donde se necesita el shape concreto (ej:
 * el panel del simulador que llama a `addSteps`). Quien usa este tipo se
 * compromete a hacer un cast explícito y solo es válido mientras la factory
 * devuelva `SimulatedStepSource`.
 */
export type StepSourceInstance = SimulatedStepSource;
