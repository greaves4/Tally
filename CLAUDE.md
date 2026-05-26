# StepApp — Contexto del proyecto para Claude Code

> Este archivo es la memoria persistente del proyecto. Léelo siempre antes de empezar cualquier tarea.

---

## Qué es StepApp

App móvil de conteo de pasos para iOS. Construida 100% con asistencia de IA como ejercicio interno para evaluar arquitectura de trabajo con agentes.

La app cuenta pasos del día, persiste el historial localmente, se resetea a medianoche, y propone misiones diarias variadas que mantienen un streak con un comodín semanal para protegerlo.

**No es una app de fitness completa.** No tracking de rutas, no calorías, no peso. El alcance es deliberadamente angosto.

---

## Stack y herramientas

- **Runtime:** React Native con Expo (managed workflow)
- **Lenguaje:** TypeScript estricto (`strict: true`)
- **Plataforma actual:** iOS (simulador para desarrollo y demo, dispositivo físico cuando se active Apple Developer)
- **Sensores (cuando estén disponibles):** `expo-sensors` Pedometer
- **Persistencia:** `expo-sqlite` para historial diario
- **Estado:** Zustand para estado global ligero
- **Notificaciones:** `expo-notifications` (locales)
- **Estilos:** StyleSheet nativo de RN + tokens del design system (`/design-system/tokens.ts`)
- **Navegación:** `expo-router`
- **Testing:** Jest + React Native Testing Library

**Decisión deliberada de NO usar:**
- Redux (overkill para este alcance)
- NativeWind/Tailwind (mantenemos StyleSheet nativo para que el design system sea explícito)
- Backend remoto (todo es local)
- Analytics de terceros (privacidad del usuario primero)

---

## Decisión arquitectónica clave: el patrón `StepSource`

**El problema:** El simulador de iOS no tiene sensores reales. Sin Apple Developer Program no podemos correr en dispositivo físico, y depender de hardware para desarrollo es frágil aunque tuviéramos developer account.

**La solución:** Inversión de dependencias. Toda la app consume pasos a través de una interfaz `StepSource`, no de un módulo concreto.

```ts
// features/steps/sources/StepSource.ts
export interface StepSource {
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<PermissionStatus>;
  getStepsForRange(start: Date, end: Date): Promise<number>;
  watchSteps(callback: (newSteps: number) => void): Subscription;
}
```

**Implementaciones:**

1. **`SimulatedStepSource`** (default en desarrollo y demo):
   - Permite al usuario agregar pasos manualmente desde un panel de debug
   - Modo "auto-walking" que incrementa pasos a un ritmo configurable
   - Persiste su estado interno en SQLite
   - Idéntica API que el real, así que la lógica de negocio nunca sabe la diferencia

2. **`PedometerStepSource`** (cuando esté Apple Developer + dispositivo físico):
   - Implementación real con `expo-sensors` Pedometer
   - Pendiente de implementación hasta que se active developer account

**Por qué esto es importante (NO es un parche):**
- Toda la lógica de negocio (misiones, streak, persistencia, reset, UI) se desarrolla y prueba sin depender de hardware
- El swap entre implementaciones es una sola línea (factory que decide cuál inyectar)
- En la presentación, esto demuestra arquitectura limpia, no improvisación
- Es el mismo patrón que cualquier app seria usa para testear lógica que depende de sensores

**Cómo se selecciona la implementación:**
```ts
// features/steps/sources/index.ts
export const getStepSource = (): StepSource => {
  if (Constants.appOwnership === 'expo' || __DEV__) {
    return new SimulatedStepSource();
  }
  return new PedometerStepSource();
};
```

---

## Convenciones de código

### Estructura de carpetas

```
app/                    # Rutas de expo-router
components/             # Componentes UI reutilizables
  base/                 # Botones, Cards, primitives
  features/             # Componentes específicos de feature
features/               # Lógica de negocio por dominio
  steps/                # Contador, persistencia, reset
    sources/            # StepSource y sus implementaciones
  missions/             # Catálogo, motor, streak
  simulator/            # Panel de debug del simulador
hooks/                  # Custom hooks compartidos
lib/                    # Utilidades puras, sin side effects
design-system/          # tokens, theme, helpers de estilo
stores/                 # Zustand stores
types/                  # TS types compartidos
```

### Naming

- Componentes: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilidades: `camelCase.ts`
- Tipos: `PascalCase` en `types/index.ts` o coubicados si son locales
- Archivos de test: `*.test.ts` o `*.test.tsx` junto al archivo que prueban

### Reglas de código

1. **Nada de `any`.** Si no sabes el tipo, pregunta o usa `unknown` y narrow.
2. **Nada de side effects en render.** Sensores y storage van en hooks con `useEffect` y cleanup.
3. **Cleanup obligatorio.** Cualquier subscription debe limpiarse en el return del `useEffect`.
4. **Manejo de permisos explícito.** Nunca asumas que el usuario dio permiso.
5. **Sin números mágicos.** Umbrales, intervalos, todo a constantes nombradas en `lib/constants.ts`.
6. **La lógica de negocio NO conoce la implementación del StepSource.** Solo la interfaz.

---

## Decisiones de producto importantes

### Detección de pasos: ¿cómo?

**Decisión:** Patrón `StepSource` (ver arriba). En desarrollo y demo usamos `SimulatedStepSource`. En producción (futuro) usaremos `PedometerStepSource` con `expo-sensors` Pedometer.

**Por qué Pedometer y no acelerómetro crudo:** Pedometer de iOS tiene años de calibración y filtrado de ruido. Reimplementarlo con el acelerómetro daría peor calidad y más batería consumida.

### Misiones: ¿cómo se generan?

**Decisión:** Catálogo curado de ~15-20 plantillas de misiones. Cada día a las 00:00 se selecciona pseudo-aleatoriamente una, con reglas que evitan repetir las últimas 3.

**Por qué:** Generación 100% aleatoria daría misiones imposibles o tontas. Catálogo curado es predecible, debuggeable, y permite ajustar dificultad sin redeploy.

### Streak: ¿qué lo rompe?

**Decisión:** No completar la misión del día rompe el streak. **Pero** hay 1 "comodín" por semana: si no la completas, no se rompe, se consume el comodín. El comodín se regenera cada lunes.

**Por qué:** Streaks frágiles generan ansiedad y desinstalación. El comodín mantiene la presión sin ser cruel.

### Panel de simulador: ¿es feature o herramienta de debug?

**Decisión:** En esta versión, accesible desde Settings con un toggle "Modo desarrollo". Cuando se active producción real, se oculta automáticamente si `__DEV__ === false`.

**Por qué:** Necesario para demo y desarrollo, pero no parte del producto final. La separación es explícita.

---

## Glosario

- **Paso del día**: pasos detectados entre 00:00 y 23:59 del día local del usuario
- **StepSource**: interfaz que abstrae de dónde vienen los pasos (simulado o real)
- **Reset de medianoche**: proceso que archiva los pasos del día que termina y arranca el contador en 0
- **Misión del día**: objetivo variable que el usuario debe cumplir para extender su streak
- **Streak**: número consecutivo de días con misión completada
- **Comodín**: pase semanal que protege el streak de un día fallido

---

## Qué hacer cuando algo no está claro

1. Si la duda es de **arquitectura general**: pregunta al usuario, no inventes.
2. Si la duda es de **un dominio específico**: delega al subagente correspondiente.
   - StepSource, persistencia de pasos, simulador → `sensor-specialist`
   - UI, layout, animaciones → `ui-builder`
   - Bugs, edge cases, calidad → `qa-reviewer`
3. Si vas a tomar una decisión que afecte arquitectura, **documéntala aquí** en este archivo antes de implementarla.

---

## Qué NO hacer (lecciones aprendidas)

- ❌ No uses `setInterval` para el reset de medianoche. Usa `expo-background-fetch` o calcula la diferencia al abrir la app. `setInterval` se pierde cuando la app se cierra.
- ❌ No bloquees la UI esperando que `expo-sqlite` cargue todo el historial. Carga el día actual primero, el resto lazy.
- ❌ No uses `console.log` en código que va a producción. Usa el logger de `lib/logger.ts` que se silencia en builds release.
- ❌ No acoples la lógica de misiones a `SimulatedStepSource` directamente. Siempre vía la interfaz `StepSource`.
- ❌ No mezcles el panel de simulador con la UI del producto. Vive en `features/simulator/`.

---

## Roadmap (fuera de scope de esta versión)

- [ ] `PedometerStepSource` real cuando se active Apple Developer Program
- [ ] Integración con Apple HealthKit (lectura de pasos)
- [ ] Distribución vía TestFlight
- [ ] Notificaciones de inactividad inteligentes
- [ ] Modo desafío con código compartible

---

## Estado actual del proyecto

> Actualiza esta sección a medida que avances.

- [x] Setup inicial Expo + TypeScript + Zustand + expo-sqlite (Sprint 0)
- [x] ThemeProvider + useTheme + componentes base Text/Card/PressableCard (Sprint 1)
- [ ] Interfaz `StepSource` definida
- [ ] `SimulatedStepSource` funcionando con panel de debug
- [ ] Persistencia diaria con SQLite
- [ ] Reset de medianoche
- [ ] Sistema de misiones + streak + comodín
- [ ] Design system aplicado a todas las pantallas
- [ ] Pantalla principal con contador + misión del día + streak
- [ ] Pantalla de historial
- [ ] Pantalla de settings con toggle del simulador
