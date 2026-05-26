---
name: step-counter
description: Usar cuando se trabaje con la lógica de pasos del día, persistencia diaria del historial en SQLite, reset de medianoche, o consumo de pasos desde la interfaz StepSource (sin importar qué implementación esté inyectada). Aplica para queries de historial, lógica de "primera apertura del día", y manejo del contador en estado global. NO usar para la implementación concreta del simulador (esa es step-simulator) ni para componentes visuales (esa es ui-builder).
---

# Skill: Step Counter

## Cuándo aplicar esta skill

Aplica esta skill cuando el trabajo involucre **cualquiera** de estos puntos:

- Definir o consumir la interfaz `StepSource`
- Persistir o leer el contador diario de pasos en SQLite
- Implementar o debuggear el reset de medianoche
- Calcular pasos por rango de fechas
- Manejar el caso "primera apertura del día" o "primera apertura tras varios días"
- Manejar el estado global de pasos vía Zustand
- Lógica de zona horaria local para determinar "el día actual"

## La interfaz `StepSource`

Esta interfaz es el corazón de la arquitectura de pasos. Toda la app consume desde ella, nunca de una implementación concreta.

```ts
// features/steps/sources/StepSource.ts

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type Subscription = {
  remove(): void;
};

export interface StepSource {
  /** ¿Existe esta fuente en el dispositivo actual? */
  isAvailable(): Promise<boolean>;

  /** Pide permiso (si la fuente lo requiere) */
  requestPermission(): Promise<PermissionStatus>;

  /** Estado actual del permiso, sin pedirlo */
  getPermissionStatus(): Promise<PermissionStatus>;

  /** Total de pasos entre dos fechas */
  getStepsForRange(start: Date, end: Date): Promise<number>;

  /** Suscripción a nuevos pasos en tiempo real */
  watchSteps(callback: (newSteps: number) => void): Subscription;
}
```

**Regla absoluta:** la lógica de negocio (misiones, streak, UI principal) importa solo el tipo `StepSource` y consume vía un hook que obtiene la implementación inyectada. Nunca importa `SimulatedStepSource` ni `PedometerStepSource` directamente.

## Persistencia

Usamos `expo-sqlite`. Esquema:

```sql
CREATE TABLE IF NOT EXISTS daily_steps (
  date TEXT PRIMARY KEY,       -- 'YYYY-MM-DD' en zona horaria local
  steps INTEGER NOT NULL,
  source_type TEXT NOT NULL,   -- 'simulated' | 'pedometer'
  last_updated TEXT NOT NULL   -- ISO timestamp
);
```

**Reglas:**
- La clave es la fecha local del usuario, NO UTC. Esto importa porque un usuario en CDMX que camina a las 23:30 debe contarse en ese día, no en el día UTC siguiente.
- `source_type` permite saber con qué se contó (útil para debug y para mostrar al usuario)
- `last_updated` permite saber si el dato está fresco
- Nunca borres registros. El historial es del usuario.

## Reset de medianoche

**No uses `setInterval`.** Se pierde cuando la app se cierra.

**Estrategia correcta:**
1. Al abrir la app, lee la fecha del último registro en `daily_steps`.
2. Compara con la fecha local actual.
3. Si son distintas: archiva el último registro (ya está guardado, solo confirma), y empieza el nuevo día consultando `stepSource.getStepsForRange(startOfToday, now)`.
4. Si están en el mismo día: continúa donde estaba.

**Hook recomendado:**

```ts
// hooks/useDailyStepReset.ts
export function useDailyStepReset(source: StepSource) {
  useEffect(() => {
    const checkAndReset = async () => {
      const today = formatLocalDate(new Date()); // 'YYYY-MM-DD'
      const lastRecord = await db.getLastDailyRecord();
      
      if (lastRecord?.date !== today) {
        // Día nuevo: inicializar
        const startOfToday = getStartOfDay(new Date());
        const initialSteps = await source.getStepsForRange(startOfToday, new Date());
        await db.upsertDailySteps(today, initialSteps, sourceType);
      }
    };

    checkAndReset();
    
    // Re-check al volver al foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAndReset();
    });
    
    return () => sub.remove();
  }, [source]);
}
```

## Manejo de zona horaria

**Siempre usa la zona horaria local del dispositivo.**

```ts
// lib/dates.ts
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfDay(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}
```

**NUNCA uses UTC** para determinar "el día actual del usuario". Usa siempre el `Date` local.

## Casos edge a manejar siempre

1. **Usuario abre la app después de 3 días sin abrirla.** Si el source soporta `getStepsForRange` con días pasados, recupera los datos. Si no (caso del simulador), esos días quedan como están en SQLite (probablemente sin actualizar).
2. **Cambio de zona horaria (viaje).** La fecha local cambia. Decisión: respeta la zona horaria nueva, el día se calcula con la zona del dispositivo en el momento de la lectura.
3. **Usuario revoca permiso desde Settings mientras la app está cerrada.** Al volver a abrir, `getPermissionStatus()` devuelve 'denied'. Muestra UI explicativa.
4. **Source no disponible.** Si `isAvailable()` devuelve false, no intentes pedir permiso. Muestra UI de fallback.

## Qué NO hacer

- ❌ No importes una implementación concreta de StepSource desde la lógica de negocio. Usa la interfaz.
- ❌ No guardes el contador en `AsyncStorage`. SQLite permite queries por rango.
- ❌ No pongas el contador en estado global sin persistir. Si la app se mata, lo pierdes.
- ❌ No uses `Date.now()` para comparar días. Usa `formatLocalDate()`.
- ❌ No bloquees el render esperando lectura de SQLite. Carga el día actual primero.

## Cómo verificar que funcionó

1. Abre la app, agrega pasos (vía el simulador en dev)
2. El contador debe subir en tiempo real
3. Cierra y reabre la app: el número debe persistir
4. Cambia la fecha del simulador iOS a mañana (Features → Toggle → Date): al abrir, el contador debe estar en 0 y el día anterior archivado en historial
