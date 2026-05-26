# StepApp

App móvil de conteo de pasos para iOS con sistema de misiones diarias y streak protegido por comodín semanal. Construida 100% con asistencia de IA.

---

## Stack

- React Native + Expo (managed workflow)
- TypeScript estricto
- expo-sqlite para persistencia local
- Zustand para estado global
- expo-router para navegación

## Características

### Base
- Contador de pasos del día actual
- Persistencia local del historial completo
- Reset automático a medianoche (zona horaria local)
- Visualización del progreso diario

### Función extra: Misiones en cadena
- Misión diaria variable seleccionada de un catálogo curado
- Streak (días consecutivos cumpliendo la misión)
- Comodín semanal que protege el streak de un día fallido
- Misiones calibradas según el promedio del usuario

## Cómo correr

```bash
npm install
npx expo start
# Presiona 'i' para abrir en simulador de iOS
```

En el primer launch, ve a Settings → activa el "Modo desarrollo" y abre el panel del simulador para generar pasos.

---

# Arquitectura de IA

> Esta sección documenta cómo está organizado el trabajo con agentes de IA en este proyecto. Es parte del ejercicio evaluativo y la pieza más importante de la arquitectura del repositorio.

## Visión general

```
StepApp/
├── CLAUDE.md                  # Memoria persistente del proyecto
├── .claude/
│   ├── skills/                # Conocimiento técnico especializado por dominio
│   │   ├── step-counter/
│   │   ├── step-simulator/
│   │   └── daily-missions/
│   └── agents/                # Roles con propósitos diferenciados
│       ├── mobile-dev.md      # Orquestador
│       ├── sensor-specialist.md
│       ├── ui-builder.md
│       └── qa-reviewer.md
└── [código de la app]
```

## Filosofía

**Cada herramienta de IA para lo que hace mejor:**

1. **Definición de producto y arquitectura** → Claude (chat) para pensar el problema antes de tocar código.
2. **Diseño visual** → Claude Design para mockups y sistema de tokens.
3. **Implementación** → Claude Code con subagentes especializados.

No usar la misma herramienta para todo. La especialización mejora la calidad de cada paso.

## CLAUDE.md vs Skills vs Agents — la separación

Esta es la distinción más importante de toda la arquitectura. Cada pieza responde a una pregunta diferente:

| Pieza | Responde a | Cuándo se carga |
|---|---|---|
| **CLAUDE.md** | ¿Qué es este proyecto? ¿Cuáles son sus reglas globales? | Siempre, en cada sesión |
| **Skill** | ¿Cómo se hace X tarea específica bien? | Cuando se aplica al trabajo actual |
| **Agent** | ¿Quién hace qué, y con qué autoridad? | Cuando se delega trabajo |

**Si está en CLAUDE.md:** es conocimiento que todo agente y toda tarea necesita (stack, convenciones, decisiones de producto irreversibles).

**Si está en una Skill:** es conocimiento profundo de un dominio técnico que solo importa cuando se trabaja en ese dominio (cómo usar Pedometer, cómo evaluar misiones, cómo persistir en SQLite).

**Si está en un Agent:** es un rol con responsabilidades y constraints específicos (qué hace, qué NO hace, cómo entrega su trabajo).

## Por qué hay 3 skills

Las 3 skills (`step-counter`, `step-simulator`, `daily-missions`) responden a 3 dominios técnicos diferenciados:

- **`step-counter`** documenta la abstracción `StepSource` y la persistencia. Es lo que cualquier feature de la app necesita saber para consumir pasos.
- **`step-simulator`** documenta la implementación concreta del simulador de pasos (vital porque desarrollamos en simulador de iOS, que no tiene sensores reales).
- **`daily-missions`** documenta el catálogo de misiones, el motor de evaluación y la lógica del streak con comodín.

Cada skill tiene un `description` específico que indica **cuándo aplicarla y cuándo NO**. Esta precisión es lo que evita que un agente cargue contexto irrelevante.

## Por qué 4 agentes con roles diferenciados

| Agente | Pregunta que responde | Cuándo NO actúa |
|---|---|---|
| `mobile-dev` | ¿Cuál es la arquitectura general y quién hace qué? | Cuando hay un especialista mejor para la tarea |
| `sensor-specialist` | ¿Cómo se obtienen y persisten los datos de pasos correctamente? | UI, lógica de negocio fuera de pasos |
| `ui-builder` | ¿Cómo se construye esta pantalla siguiendo el design system? | Lógica de negocio, decisiones técnicas de bajo nivel |
| `qa-reviewer` | ¿Qué puede romperse en este código? | Construir features nuevas, decisiones de producto |

El error típico es tener un solo agente "que hace todo" o varios agentes con responsabilidades solapadas. Cada uno aquí tiene un dominio claro y limitado, lo cual:

1. Mantiene su contexto enfocado (mejor calidad de output)
2. Permite delegación clara (mobile-dev sabe exactamente a quién mandar qué)
3. Establece checks and balances (qa-reviewer audita lo que otros escribieron)

## Decisión clave: el patrón `StepSource`

La decisión arquitectónica más importante del proyecto. Está documentada en detalle en `CLAUDE.md` pero el resumen es:

**El problema:** Sin Apple Developer Program no podemos correr en iPhone físico, y el simulador de iOS no tiene sensores. ¿Cómo desarrollamos una app de pasos?

**La solución:** Toda la app consume pasos desde una interfaz `StepSource`. Hay dos implementaciones:
- `SimulatedStepSource` (default actual): genera pasos sintéticos vía un panel de debug
- `PedometerStepSource` (futuro): implementación real con `expo-sensors`

El swap entre implementaciones ocurre en una sola línea (la factory). **La lógica de negocio jamás sabe la diferencia.**

Esto no es un workaround. Es inversión de dependencias estándar de la industria. Cualquier app móvil seria tiene este patrón para poder testear lógica que depende de sensores sin tener que ejercitarlos manualmente cada vez.

## Workflow de trabajo con la IA

1. **Antes de pedir código:** definir en chat con Claude qué se va a construir. Las decisiones de producto y arquitectura no salen de Claude Code.
2. **Diseñar antes de implementar:** mockups en Claude Design → tokens del design system → recién entonces implementación.
3. **Empezar por la interfaz:** `StepSource` se definió antes que cualquier implementación. Eso permitió que `daily-missions` se desarrollara en paralelo sin esperar a sensores.
4. **Delegar a especialistas:** `mobile-dev` no implementa todo. Identifica el dominio y delega.
5. **Revisar antes de cerrar:** cada feature pasa por `qa-reviewer` antes de marcarse completa.

## Preguntas que esta arquitectura me permite responder

(Las preguntas que el ejercicio pide poder responder al final)

**¿Qué va en CLAUDE.md y qué va en una skill?**
CLAUDE.md tiene contexto global del proyecto: stack, convenciones, decisiones irreversibles, glosario. Una skill tiene conocimiento técnico profundo de un dominio específico que solo importa cuando trabajas en ese dominio.

**¿Cuándo creas un subagente en lugar de hacer todo en el agente principal?**
Cuando un dominio tiene profundidad técnica propia, vocabulario propio y bugs típicos propios. Si meter ese dominio en el agente principal "ensucia" el contexto de otros dominios, es señal de que necesitas un subagente.

**¿Cómo le das contexto especializado a la IA sin repetirlo en cada prompt?**
Tres capas: CLAUDE.md para lo global, skills para lo técnico-específico, agents para los roles. La IA carga automáticamente lo que aplica, no lo repites en cada conversación.

**¿Cómo estructuras un proyecto real para que otro dev entienda cómo está configurada la IA?**
Esta misma sección del README. Documentar la filosofía y las decisiones, no solo los archivos. Y mantener CLAUDE.md actualizado con el estado real del proyecto.

## Roadmap

- [ ] Implementar `PedometerStepSource` cuando se active Apple Developer Program
- [ ] Distribución vía TestFlight
- [ ] Integración con Apple HealthKit (lectura)
- [ ] Notificaciones de inactividad inteligentes
