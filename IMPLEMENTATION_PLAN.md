# Plan de Implementación — StepApp

> Guía paso a paso para construir la app en Claude Code, con prompts listos para copiar.

---

## Antes de empezar (15 min)

### Pre-requisitos en tu máquina

1. **Node.js 20+** instalado
2. **Git** instalado y configurado
3. **Xcode** instalado (para simulador iOS)
4. **Watchman** (opcional pero recomendado): `brew install watchman`
5. **Claude Code** instalado y autenticado

### Crear el repositorio

```bash
mkdir StepApp && cd StepApp
git init
git checkout -b main
```

### Descargar Plus Jakarta Sans

Antes de cualquier prompt:
1. Ve a https://fonts.google.com/specimen/Plus+Jakarta+Sans
2. Descarga la familia completa
3. Extrae solo estos 4 archivos (descarta el resto):
   - `PlusJakartaSans-Regular.ttf`
   - `PlusJakartaSans-Medium.ttf`
   - `PlusJakartaSans-SemiBold.ttf`
   - `PlusJakartaSans-Bold.ttf`
4. Guárdalos por ahora en cualquier carpeta, los moveremos después

### Copiar tus archivos de arquitectura al repo

Antes del primer prompt, asegúrate que en tu carpeta `StepApp/` ya tienes:
```
StepApp/
├── CLAUDE.md
├── README.md
├── .claude/
│   ├── skills/
│   │   ├── step-counter/SKILL.md
│   │   ├── step-simulator/SKILL.md
│   │   └── daily-missions/SKILL.md
│   └── agents/
│       ├── mobile-dev.md
│       ├── sensor-specialist.md
│       ├── ui-builder.md
│       └── qa-reviewer.md
└── design-system/
    ├── tokens.ts
    └── IMPLEMENTATION_NOTES.md
```

Esto es tu input. Sin esto Claude Code no tiene contexto.

### Hacer un commit inicial antes de programar

```bash
git add .
git commit -m "chore: initial AI architecture (CLAUDE.md, skills, agents, design tokens)"
```

**Por qué importa:** En la presentación, mostrar el git log con este primer commit demuestra que la arquitectura existió ANTES del código. Es evidencia.

---

## Sprint 0 — Setup del proyecto (30 min)

**Objetivo:** dejar el proyecto Expo corriendo con dependencias instaladas y Plus Jakarta Sans cargado.

### Prompt #1 para Claude Code

```
Hola. Soy [tu nombre], el desarrollador del proyecto.

Antes de cualquier tarea, lee estos archivos en orden:
1. /CLAUDE.md
2. /design-system/IMPLEMENTATION_NOTES.md
3. /design-system/tokens.ts

Después confirma que entendiste:
- El stack que vamos a usar
- El patrón StepSource
- La decisión de tokens como fuente de verdad
- Tu rol como mobile-dev y cuándo delegar

Cuando confirmes el contexto, vamos a empezar con Sprint 0: setup del proyecto Expo.
```

**Qué esperar:** Claude Code va a resumir lo que leyó. Verifica que:
- Identificó el stack correctamente
- Entendió el patrón StepSource
- Sabe que `tokens.ts` manda sobre los mockups
- Reconoce los 3 subagentes y cuándo delegar

**Si no menciona alguno de estos, pídele que lo aclare antes de seguir.**

### Prompt #2 — Inicializar proyecto

```
Excelente. Ahora ejecuta Sprint 0: setup del proyecto.

Tareas:
1. Inicializa un proyecto Expo con TypeScript estricto (template blank-typescript)
2. Instala estas dependencias:
   - expo-router (navegación)
   - expo-sqlite (persistencia)
   - expo-sensors (para StepSource futuro)
   - expo-notifications (notificaciones locales)
   - expo-font (carga de Plus Jakarta Sans)
   - zustand (estado global)
   - react-native-svg (anillo de progreso, charts)
   - react-native-reanimated (animaciones)
   - lucide-react-native (íconos)
   - date-fns (manejo de fechas con zona horaria)
3. Configura tsconfig.json con strict: true y noUncheckedIndexedAccess: true
4. Configura ESLint con la config de Expo
5. Crea la estructura de carpetas según CLAUDE.md:
   app/, components/{base,features}/, features/{steps/sources,missions,simulator}/, 
   hooks/, lib/, design-system/, stores/, types/
6. Crea /lib/constants.ts vacío con un comentario sobre que va aquí
7. Crea /lib/dates.ts con las funciones formatLocalDate, getStartOfDay, getEndOfDay 
   (ver skill step-counter)
8. NO crees componentes ni features todavía. Solo el esqueleto.

Después del setup:
- Verifica que `npm start` arranca sin errores
- Reporta qué archivos creaste

NO delegues nada en este sprint, es trabajo de orquestación que te toca a ti como mobile-dev.
```

### Verificación Sprint 0

```bash
npm start
# Presiona 'i' para iOS
# Debe aparecer la pantalla default de Expo sin crashes
```

**Si funciona:** commit.
```bash
git add . && git commit -m "feat: sprint 0 — project setup with Expo + TS + dependencies"
```

---

## Sprint 1 — Design system base (1-2 horas)

**Objetivo:** tener un ThemeProvider funcionando, fuentes cargadas, y los primeros 3 componentes base (Text, Card, Pressable).

### Prompt #3

```
Sprint 1: Design system base.

Tareas:
1. Crea la carpeta /assets/fonts/ y avísame para que copie ahí los 4 archivos .ttf 
   de Plus Jakarta Sans (Regular, Medium, SemiBold, Bold).
2. Configura expo-font en app/_layout.tsx para cargarlas.
3. Crea /design-system/ThemeProvider.tsx con un Context que provee el theme actual 
   (light/dark) basado en useColorScheme().
4. Crea hook /design-system/useTheme.ts que consume el context y devuelve el Theme.
5. Crea componente base /components/base/Text.tsx que recibe variant (displayHero, 
   headlineLg, etc.) y aplica los estilos correctos del token.
6. Crea componente base /components/base/Card.tsx con variantes (default, elevated).
7. Crea componente base /components/base/PressableCard.tsx con feedback de opacity 0.7 
   on press.

Reglas estrictas:
- Nada de "any"
- Nada de colores hardcodeados — todo desde useTheme()
- Nada de números mágicos — usar tokens.spacing y tokens.radius

Para este sprint puedes delegar a ui-builder. Cuando termines, dame:
- Lista de archivos creados
- Cualquier decisión que tomaste sobre ambigüedades
- Cómo probaste que las fuentes cargan correctamente
```

Cuando Claude Code te pida copiar las fuentes:

```bash
# desde la carpeta donde descargaste las fuentes
cp PlusJakartaSans-Regular.ttf StepApp/assets/fonts/
cp PlusJakartaSans-Medium.ttf StepApp/assets/fonts/
cp PlusJakartaSans-SemiBold.ttf StepApp/assets/fonts/
cp PlusJakartaSans-Bold.ttf StepApp/assets/fonts/
```

### Prompt #4 — Verificación del Sprint 1

```
Crea una pantalla temporal de prueba en app/_design-test.tsx que muestre:
- Todos los variants tipográficos con su nombre como label
- Un Card con texto adentro
- Un PressableCard con texto adentro
- Un toggle visual entre light y dark mode (botón)
- Que muestre los colores principales como swatches

Esto es solo para verificar visualmente. La borraremos después.
```

**Verificación:** abre la app, navega a `/_design-test`. Si se ve bien en light y dark, el design system está sano.

**Commit:**
```bash
git add . && git commit -m "feat: sprint 1 — design system base (theme, fonts, base components)"
```

---

## Sprint 2 — StepSource y persistencia (2-3 horas)

**Objetivo:** la abstracción StepSource implementada, SimulatedStepSource funcionando, persistencia en SQLite, y un panel de debug mínimo para inyectar pasos.

### Prompt #5

```
Sprint 2: StepSource y persistencia. Este es el corazón arquitectónico del proyecto.

Tareas (en este orden estricto):

PASO 1: Definir la interfaz
Crea /features/steps/sources/StepSource.ts con la interfaz completa según la skill 
step-counter.

PASO 2: Implementar persistencia
Crea /lib/db.ts que:
- Inicializa expo-sqlite
- Crea las tablas daily_steps y simulator_steps según los esquemas en las skills
- Expone funciones: upsertDailySteps, getDailySteps, getStepsRange, recordSimulatorSteps, 
  getSimulatorStepsForRange

PASO 3: Implementar SimulatedStepSource
Crea /features/steps/sources/SimulatedStepSource.ts según la skill step-simulator.
Incluye los métodos extra: addSteps, startAutoWalk, stopAutoWalk.

PASO 4: Factory
Crea /features/steps/sources/index.ts con getStepSource() que devuelve singleton 
de SimulatedStepSource (en futuro decidirá entre simulated y pedometer).

PASO 5: Hook
Crea /hooks/useStepsToday.ts que:
- Llama a getStepSource()
- Lee los pasos del día actual
- Se suscribe a watchSteps para updates en tiempo real
- Cleanup obligatorio en useEffect return
- Maneja zona horaria local (no UTC)

PASO 6: Panel de debug mínimo
Crea /features/simulator/SimulatorPanelMinimal.tsx con SOLO 4 botones: +100, +500, 
+1k, +5k. Sin auto-walk todavía. Sin estilos pulidos, solo funcional.

PASO 7: Pantalla de prueba
En /app/_design-test.tsx (la que ya existe), agrega abajo:
- El hook useStepsToday mostrando el número actual
- El SimulatorPanelMinimal debajo
- Probar que al presionar botones, el número sube

DELEGA: PASO 1-5 son de sensor-specialist. PASO 6 y 7 son de ui-builder.
TÚ (mobile-dev): integras y verificas que todo encaja.

QA OBLIGATORIO: cuando termines, llama a qa-reviewer para auditar:
- Memory leaks en watchSteps
- Cleanup correcto
- Zona horaria local respetada
- Lógica de negocio NO importa SimulatedStepSource directamente

Reporta el resultado del QA al final.
```

### Verificación Sprint 2

En la pantalla de test, presiona los botones. El contador debe:
- Subir inmediatamente al presionar
- Persistir al recargar la app (cerrar y volver a abrir)
- Volver a 0 si cambias la fecha del simulador iOS a "mañana"

**Commit:**
```bash
git add . && git commit -m "feat: sprint 2 — StepSource pattern, SQLite persistence, simulated source"
```

---

## Sprint 3 — Pantalla Home (3-4 horas)

**Objetivo:** la pantalla principal funcionando con todos los componentes visuales del diseño.

### Prompt #6

```
Sprint 3: Pantalla Home (la más visible del producto).

Tareas:

PASO 1: Componentes específicos
- /components/features/ProgressRing.tsx — anillo SVG con cifra centrada
- /components/features/DataSourceIndicator.tsx — chip de fuente activa
- /components/features/MissionCard.tsx — card con título, descripción, progreso, CTA
- /components/features/Header.tsx — avatar + saludo + fecha + bell

PASO 2: Reset de medianoche
Crea /hooks/useDailyStepReset.ts según la skill step-counter.
Integra con useStepsToday para que al cambiar el día, el contador se resetee.

PASO 3: Pantalla Home
- /app/(tabs)/index.tsx con la composición completa según el mockup final (Imagen 4)
- Usa los componentes anteriores
- Muestra: header, ProgressRing con cifra, DataSourceIndicator, MissionCard (mock 
  por ahora, sin lógica real de misiones)

PASO 4: Tab Bar
- Crea el layout de tabs en /app/(tabs)/_layout.tsx con 3 tabs: Hoy, Progreso, Ajustes
- Solo Hoy tiene contenido real por ahora. Las otras dos: placeholder.
- Sigue Implementation Note DI-002.

DELEGA: PASO 1, 3, 4 a ui-builder. PASO 2 a sensor-specialist.
TÚ: integras todo.

Reglas:
- Datos de la misión: hardcoded por ahora (la lógica de misiones es Sprint 4)
- Pasos: vienen del hook useStepsToday
- Fuente: viene del hook (debería ser 'simulated')

QA: revisa accesibilidad, dark mode, y safe area en notch.

Borra /app/_design-test.tsx ya que no la necesitamos más.
```

### Verificación Sprint 3

- Abre la app en simulador iOS
- Pantalla Home se ve como el mockup
- Presiona en el tab "Hoy" → debe mostrar el contador
- Dark mode funciona (cambia el tema del simulador iOS)
- El indicador "Simulador" es visible

**Commit:**
```bash
git add . && git commit -m "feat: sprint 3 — Home screen with progress ring, header, mission card"
```

---

## Sprint 4 — Sistema de misiones (3-4 horas)

**Objetivo:** misiones diarias funcionando, streak con comodín semanal, persistencia completa.

### Prompt #7

```
Sprint 4: Sistema de misiones diarias. Esta es nuestra función extra, la que define 
el producto.

Tareas:

PASO 1: Catálogo de misiones
Crea /features/missions/catalog.ts con 10-15 plantillas según la skill daily-missions.
Incluye al menos:
- 3 TOTAL_STEPS de distintas dificultades
- 2 STEPS_BEFORE_TIME
- 2 STEPS_AFTER_TIME
- 1 BEAT_AVERAGE
- 1 NO_ZERO_HOURS
- 1 STREAK_PROTECTION

Cada plantilla tiene su función generateInstance pura.

PASO 2: Motor de evaluación
Crea /features/missions/engine.ts con:
- selectDailyMission(userContext) — elige una plantilla del catálogo
- evaluateMission(instance, dayData) — devuelve si se cumplió

PASO 3: Persistencia
Extiende /lib/db.ts con:
- Tablas missions_daily y streak_state según la skill
- Funciones: getMissionForDate, upsertMission, markMissionCompleted, 
  getStreakState, updateStreakState

PASO 4: Lógica del comodín
Crea /features/missions/wildcard.ts con:
- regenerateWildcardIfMonday() — chequea si es lunes y regenera el comodín
- evaluateDayAndUpdateStreak(date) — la lógica completa según la skill

PASO 5: Hook
Crea /hooks/useDailyMission.ts que:
- Devuelve la misión del día (la selecciona si no existe)
- Devuelve el progreso actual
- Devuelve el streak y comodines disponibles
- Función markAsComplete

PASO 6: Conectar UI
- MissionCard ahora recibe datos reales del hook (no hardcoded)
- Agrega componente StreakBadge para mostrar racha
- Agrega componente WildcardBadge para mostrar comodín disponible

PASO 7: Misión cumplida
Implementa el estado "Misión cumplida" según Implementation Note DI-011:
- Sin emojis
- Check + título + descripción
- Card especial cuando completed === true

DELEGA: PASO 1-4 son lógica pura, los hace mobile-dev (tú).
PASO 5 puede hacerlo mobile-dev o sensor-specialist (es persistencia).
PASO 6-7 son de ui-builder.

QA OBLIGATORIO: pide a qa-reviewer que valide:
- Streak no se incrementa dos veces el mismo día
- Comodín no se regenera dos veces el mismo lunes
- Misión generada para "ayer" cuando abres la app después de un día sin abrirla
- Edge case: usuario nuevo sin promedio (primeros 7 días)
```

### Verificación Sprint 4

Prueba este escenario completo:
1. Abre la app → debe aparecer una misión del día
2. Presiona los botones del simulador hasta cumplir la misión
3. Verifica que aparece el estado "Misión cumplida"
4. Cambia la fecha del simulador iOS a mañana
5. Abre la app → debe aparecer una misión NUEVA y el streak debe ser 1
6. Cambia al día siguiente sin cumplir → el comodín se consume, streak sigue
7. Tercer día sin cumplir y sin comodín → streak vuelve a 0

**Commit:**
```bash
git add . && git commit -m "feat: sprint 4 — daily missions, streak, weekly wildcard"
```

---

## Sprint 5 — Pantalla Progreso (2-3 horas)

**Objetivo:** historial visual con chart de barras + lista de días.

### Prompt #8

```
Sprint 5: Pantalla Progreso (historial).

Tareas:

PASO 1: Componentes
- /components/features/BarChart.tsx — chart simple de barras según Implementation 
  Note DI-004 (no usar librerías pesadas, hacerlo con react-native-svg)
- /components/features/SegmentedControl.tsx — selector Semana/Mes/Año
- /components/features/DayHistoryRow.tsx — fila con fecha, pasos, estado de misión

PASO 2: Lógica
- /features/missions/historyQueries.ts con funciones:
  - getWeeklyData(from, to)
  - getMonthlyAverage(month, year)
  - getDailyHistory(rangeDays)
- /hooks/useProgressData.ts que usa lo anterior

PASO 3: Pantalla
- /app/(tabs)/progreso.tsx según el mockup (Imagen 7)
- Encabezado con promedio + chip de comparativa
- Segmented control de rango
- Chart de barras
- Lista "Historial Reciente" con DayHistoryRow

DELEGA: PASO 1 a ui-builder, PASO 2 a sensor-specialist, PASO 3 ambos coordinados.

Estado vacío:
- Si el usuario tiene menos de 3 días de datos, mostrar mensaje "Necesitamos un par 
  de días más para mostrarte tu historial. Sigue caminando." en lugar del chart.

Asegúrate de probar con datos del simulador.
```

### Verificación Sprint 5

- Genera datos en 5-7 días usando el simulador (cambia fecha del simulador iOS)
- Abre la pantalla Progreso
- El chart debe mostrar barras de colores correctos (verde/gris/terracota)
- La lista debajo debe coincidir

**Commit:**
```bash
git add . && git commit -m "feat: sprint 5 — Progress screen with bar chart and history list"
```

---

## Sprint 6 — Ajustes + Simulador completo (2 horas)

**Objetivo:** las dos pantallas restantes terminadas.

### Prompt #9

```
Sprint 6: Ajustes y panel del Simulador completo.

Tareas:

PASO 1: Componentes
- /components/base/Toggle.tsx — switch iOS-style con color del primary cuando ON
- /components/base/ListItem.tsx — fila de ajustes con altura mínima 56pt
- /components/features/ThemeSegmentedControl.tsx — selector Sistema/Claro/Oscuro 
  según Implementation Note DI-003

PASO 2: Store de preferencias
- /stores/preferencesStore.ts (Zustand) con:
  - themePreference: 'system' | 'light' | 'dark'
  - notificationsEnabled: boolean
  - simulatorActive: boolean
- Persistir en SQLite (extender /lib/db.ts con tabla 'preferences' o usar 
  expo-secure-store si prefieres simplicidad)

PASO 3: Pantalla Ajustes
- /app/(tabs)/ajustes.tsx con secciones:
  - NOTIFICACIONES (toggle de recordatorio)
  - APARIENCIA (ThemeSegmentedControl)
  - DESARROLLO (solo si __DEV__: toggle + botón "Abrir Panel del Simulador")
  - ACERCA DE (versión + opcional link a privacidad)
- Aplicar Implementation Notes DI-001 (sin Cerrar Sesión), DI-003 (estilo consistente)

PASO 4: Panel del Simulador completo
- /app/simulator.tsx (fuera de tabs, pantalla modal)
- Header con back button + título + banner "ENTORNO DE DESARROLLO" (DI-007)
- Sección "Pasos actuales" con cifra grande + indicador de fuente
- Sección "Inyectar Pasos": botones +100, +500, +1k, +5k + input personalizado
- Sección "Auto-Caminar": slider de velocidad + botón iniciar/detener (DI-006: en español)
- Sección "Acciones Destructivas" con color tertiary (DI-008) — NO rojo puro
- Botones: Resetear día, Borrar todo el historial del simulador

DELEGA: PASO 1-3 mayormente a ui-builder. PASO 4 coordinado con sensor-specialist 
para conectar con SimulatedStepSource.

QA: verifica que el toggle de tema funciona, que el simulador se conecta correctamente, 
y que el dark mode se ve bien en ambas pantallas.
```

### Verificación Sprint 6

- Ajustes: cambia tema → toda la app cambia
- Ajustes: toggle de simulador desactivado → panel del simulador ya no es accesible
- Panel simulador: todos los botones funcionan, auto-walk inicia y detiene correctamente
- Reset de pasos a 0 funciona

**Commit:**
```bash
git add . && git commit -m "feat: sprint 6 — Settings and Simulator panel"
```

---

## Sprint 7 — Pulido + QA final (1-2 horas)

**Objetivo:** la app está completa, ahora la dejamos demo-ready.

### Prompt #10

```
Sprint 7: Pulido final y QA exhaustivo.

Tareas:

PASO 1: QA exhaustivo
Pide a qa-reviewer que aplique TODO el checklist de su archivo .md. Reporta TODOS 
los problemas críticos y medios.

PASO 2: Resolver los problemas críticos
Para cada problema crítico encontrado, fíxalo o documenta por qué no se arregla 
(con razón válida).

PASO 3: Verificar performance
- ¿El contador sube en tiempo real sin lag perceptible?
- ¿Las transiciones entre pantallas son suaves?
- ¿No hay memory leaks (verificar con tools de Xcode si es necesario)?

PASO 4: Accesibilidad básica
- Verifica que todos los botones tienen accessibilityLabel
- Touch targets ≥ 44pt
- Funciona con texto grande del sistema

PASO 5: Estados vacíos y de error
- ¿Qué pasa si SQLite falla al inicializar?
- ¿Qué pasa si no hay misión del día por algún error?
- Asegúrate de tener fallbacks razonables

PASO 6: Datos para demo
- Crea un script o función "Cargar datos de demo" en el panel del simulador que 
  pueble 7 días de historial con datos variados (algunos días cumplidos, uno con 
  comodín, uno fallado). Útil para la presentación.

PASO 7: README final
Actualiza el README con:
- Capturas de pantalla finales (toma screenshots del simulador)
- Sección "Cómo correr"
- Resultado del QA final

Cuando termines, actualiza el "Estado actual del proyecto" en CLAUDE.md con 
todos los items marcados ✅.
```

### Verificación Sprint 7

Haz un demo completo simulando que eres el evaluador:
1. App fresca (borra del simulador y reinstala)
2. Pantalla Home con misión generada
3. Cumple la misión con el simulador
4. Ve a Progreso, ve el chart
5. Ve a Ajustes, cambia el tema
6. Abre el panel del simulador
7. Carga datos de demo
8. Vuelve a Progreso, ahora hay datos

Si todo el flujo funciona sin fricción, **la app está lista**.

**Commit final:**
```bash
git add . && git commit -m "feat: sprint 7 — final QA pass, demo data, accessibility, polish"
git tag v1.0-demo
```

---

## Resumen de tiempos esperados

| Sprint | Tiempo estimado | Acumulado |
|---|---|---|
| 0 — Setup | 30 min | 30 min |
| 1 — Design system | 1-2 hr | 1.5-2.5 hr |
| 2 — StepSource + persistencia | 2-3 hr | 3.5-5.5 hr |
| 3 — Home | 3-4 hr | 6.5-9.5 hr |
| 4 — Misiones + streak | 3-4 hr | 9.5-13.5 hr |
| 5 — Progreso | 2-3 hr | 11.5-16.5 hr |
| 6 — Ajustes + Simulador | 2 hr | 13.5-18.5 hr |
| 7 — Pulido + QA | 1-2 hr | 14.5-20.5 hr |

**Total realista: 15-20 horas de trabajo concentrado.**

En 3-4 días, distribuyéndolo en bloques de 4-6 horas por día, es alcanzable.

---

## Cuando algo sale mal

### Si Claude Code se desordena en medio de un sprint
- Para. No le pidas que "siga".
- Pregúntale: "Resume qué hiciste hasta ahora y qué falta para terminar este sprint."
- Decide tú qué dejar y qué descartar.

### Si una decisión arquitectónica nueva aparece
- NO la decidas con Claude Code. Vuelve a chat conmigo.
- Actualiza CLAUDE.md con la decisión documentada.
- Pasa al siguiente sprint con la decisión ya tomada.

### Si el QA encuentra muchos problemas
- Primero fija los críticos. Los medios pueden ir a un "tech debt" doc.
- No intentes arreglar todo en una sola sesión.

### Si te quedas sin tiempo
- Sacrifica primero: Sprint 7 (pulido)
- Después: Sprint 5 (Progreso) — pero deja la pantalla con placeholder
- Lo último que sacrificas: Sprint 4 (misiones). Es tu función extra, sin eso no hay nada que defender.

---

## Para tu presentación

Durante la presentación, vas a abrir el repo y mostrar:

1. **Git log:** muestra los commits en orden — demuestra proceso disciplinado
2. **CLAUDE.md:** lee la sección "Decisiones de producto importantes"
3. **tokens.ts + IMPLEMENTATION_NOTES.md:** explica por qué cerraste el diseño
4. **`.claude/agents/`:** muestra los 4 archivos y explica el rol de cada uno
5. **App corriendo:** demo en vivo
6. **Simulador panel:** demuestra que NO es feature, es arquitectura

**Y para el prompt en vivo:** lo más probable es que te pidan agregar algo a la app. Tú vas a:
- Identificar a qué skill aplica
- Identificar qué subagente lo hace
- Delegar con el contexto correcto
- Mostrar cómo el agente respeta los tokens y patterns

Esa demostración del workflow es lo que separa "yo programo con IA" de "yo trabajo con IA".

¡Suerte, [tu nombre]!
