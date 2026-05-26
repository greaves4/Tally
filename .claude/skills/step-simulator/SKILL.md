---
name: step-simulator
description: Usar al implementar la fuente simulada de pasos (SimulatedStepSource), el panel de debug del simulador, modo auto-walking, persistencia del estado del simulador, y el toggle de Settings que lo activa. Aplica cuando se necesite generar datos de pasos sintéticos para desarrollo, demo o testing. NO usar para la implementación real con Pedometer (esa irá en futuro) ni para la lógica que consume pasos (esa es step-counter, que solo conoce la interfaz StepSource).
---

# Skill: Step Simulator

## Cuándo aplicar esta skill

Aplica esta skill cuando el trabajo involucre:

- Implementar `SimulatedStepSource` (la implementación de `StepSource` para desarrollo)
- Construir el panel de debug del simulador (botones de "+N pasos", auto-walk on/off, velocidad)
- Persistir el estado interno del simulador (pasos acumulados del día, modo activo)
- Lógica del modo "auto-walking" (incremento periódico de pasos)
- Toggle de Settings para activar/desactivar el simulador

## Por qué existe esta skill (contexto crítico)

El simulador de iOS no tiene sensores de movimiento. Sin `SimulatedStepSource` no podríamos desarrollar ni demostrar la app. Esta no es una herramienta de testing menor, es una pieza arquitectónica que permite que toda la app funcione sin hardware real.

**Es deliberadamente fácil de remover cuando se active Apple Developer:** la factory en `features/steps/sources/index.ts` decide qué implementación inyectar, y la lógica de negocio nunca sabe la diferencia.

## Implementación

### Interfaz que cumple

Debe implementar `StepSource` completa (ver skill `step-counter`):

```ts
// features/steps/sources/SimulatedStepSource.ts

import { StepSource, PermissionStatus, Subscription } from './StepSource';

export class SimulatedStepSource implements StepSource {
  private listeners: Set<(steps: number) => void> = new Set();
  private autoWalkInterval: NodeJS.Timeout | null = null;
  
  async isAvailable(): Promise<boolean> {
    return true; // siempre disponible
  }

  async requestPermission(): Promise<PermissionStatus> {
    return 'granted'; // no necesita permiso real
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return 'granted';
  }

  async getStepsForRange(start: Date, end: Date): Promise<number> {
    // Lee de simulator_state en SQLite los pasos generados en ese rango
    return await db.getSimulatorStepsForRange(start, end);
  }

  watchSteps(callback: (newSteps: number) => void): Subscription {
    this.listeners.add(callback);
    return {
      remove: () => this.listeners.delete(callback),
    };
  }

  // === Métodos públicos extra (no en la interfaz) ===
  
  /** Agrega pasos manualmente (usado por el panel de debug) */
  async addSteps(amount: number): Promise<void> {
    const now = new Date();
    await db.recordSimulatorSteps(amount, now);
    this.notifyListeners(amount);
  }

  /** Inicia auto-walking: agrega `stepsPerTick` cada `intervalMs` */
  startAutoWalk(stepsPerTick: number, intervalMs: number): void {
    this.stopAutoWalk();
    this.autoWalkInterval = setInterval(() => {
      this.addSteps(stepsPerTick);
    }, intervalMs);
  }

  stopAutoWalk(): void {
    if (this.autoWalkInterval) {
      clearInterval(this.autoWalkInterval);
      this.autoWalkInterval = null;
    }
  }

  private notifyListeners(newSteps: number) {
    this.listeners.forEach(l => l(newSteps));
  }
}
```

### Persistencia del simulador

```sql
CREATE TABLE IF NOT EXISTS simulator_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,    -- ISO timestamp del evento
  amount INTEGER NOT NULL     -- cantidad de pasos agregados en ese evento
);

CREATE INDEX IF NOT EXISTS idx_simulator_timestamp ON simulator_steps(timestamp);
```

Cada vez que se agregan pasos (manual o auto), se inserta un row. `getStepsForRange` suma los amounts en el rango pedido.

**Por qué no solo un contador acumulado:** Mantener el historial granular permite responder queries por rango arbitrario (necesario para el reset de medianoche y para misiones que evalúan por hora).

## Panel de debug del simulador

```
features/simulator/SimulatorPanel.tsx

┌─────────────────────────────────┐
│  🔧 Simulador (modo desarrollo) │
├─────────────────────────────────┤
│  Pasos de hoy: 4,250            │
│                                  │
│  Agregar:                        │
│  [+100] [+500] [+1,000] [+5,000]│
│                                  │
│  Auto-caminar:                   │
│  [○━━━━●] velocidad: rápido      │
│  [   PAUSAR   ]                  │
│                                  │
│  Resetear día:                   │
│  [  Volver a 0 pasos  ]          │
└─────────────────────────────────┘
```

### Modos de auto-walking

```ts
const AUTO_WALK_PRESETS = {
  slow:   { stepsPerTick: 10,  intervalMs: 1000 },  // 10 pasos/seg = caminata lenta
  normal: { stepsPerTick: 30,  intervalMs: 1000 },  // 30 pasos/seg = caminata normal
  fast:   { stepsPerTick: 100, intervalMs: 1000 },  // 100 pasos/seg = simula horas
};
```

El preset `fast` permite generar 6,000 pasos en un minuto, útil para probar cumplimiento de misiones rápido en la demo.

## Toggle en Settings

```
Settings → Modo desarrollo
  [●] Simulador activo
       Genera pasos sintéticos para desarrollo y demo.
       Cuando esté en producción real (iPhone físico),
       este toggle se ocultará automáticamente.
       
  [Botón: Abrir panel del simulador]
```

## Cómo se conecta con la factory

```ts
// features/steps/sources/index.ts
import Constants from 'expo-constants';
import { SimulatedStepSource } from './SimulatedStepSource';
// import { PedometerStepSource } from './PedometerStepSource'; // futuro

let instance: StepSource | null = null;

export function getStepSource(): StepSource {
  if (instance) return instance;
  
  // En esta versión, siempre simulado.
  // Cuando se active Apple Developer y se haga build de producción,
  // este flag debe cambiar a la lógica adecuada.
  instance = new SimulatedStepSource();
  return instance;
}
```

## Casos edge

1. **Usuario cierra la app con auto-walk activo.** `setInterval` muere. Al reabrir, el auto-walk NO se reactiva solo. Decisión: explícita, el usuario reactiva si quiere.
2. **Usuario cambia el día con auto-walk activo.** Los pasos se siguen registrando en `simulator_steps` con timestamp real, así que se atribuyen al día correcto.
3. **Múltiples instancias del simulador.** No debe haber. La factory garantiza singleton.
4. **Listener no se desuscribe.** Memory leak. Cleanup obligatorio en useEffect.

## Qué NO hacer

- ❌ No expongas `SimulatedStepSource` directamente en la UI principal. Solo vía la interfaz `StepSource`.
- ❌ No hardcodees los presets de velocidad. Vive en `lib/constants.ts`.
- ❌ No olvides parar el `setInterval` cuando el usuario desactiva el toggle.
- ❌ No mezcles el panel del simulador con las pantallas del producto. Vive en su propia ruta.
- ❌ No persistas el "auto-walk activo" entre cierres de app. Es per-sesión.

## Cómo verificar que funcionó

1. Abre Settings → activa Simulador
2. Abre el panel → presiona `+1000`
3. Vuelve a la pantalla principal: contador debe mostrar 1,000
4. Activa auto-walk en velocidad rápida
5. Espera 30 segundos: contador debe haber subido ~3,000
6. Cambia la fecha del simulador iOS a mañana
7. Reabre la app: contador en 0, el día anterior en historial
