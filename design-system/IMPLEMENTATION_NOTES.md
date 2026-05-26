# Implementation Notes — StepApp Design
## Decisiones de cierre del diseño y guía de implementación para `ui-builder`

> **Estado:** Diseño cerrado. Implementación en curso.
> **Audiencia:** El agente `ui-builder` de Claude Code y cualquier persona revisando la implementación.
> **Función adicional:** Este documento sirve como defensa documentada de las decisiones de diseño tomadas durante el proceso.

---

## TL;DR

1. El diseño se iteró dos veces en Stitch (Google).
2. La primera iteración tenía 4 problemas de coherencia con el alcance del producto. Se documentaron y se corrigieron.
3. La segunda iteración resolvió esos 4 pero introdujo 6 regresiones nuevas (típico de builders de IA tras múltiples iteraciones).
4. **Decisión:** cerrar el diseño con criterio documentado en lugar de iterar infinitamente un mockup que nunca será 100% perfecto.
5. La **fuente de verdad** es ahora `/design-system/tokens.ts`. Donde los mockups difieran, gana el token.
6. Este documento lista todas las decisiones de implementación para resolver las ambigüedades.

---

## Proceso seguido (para la presentación)

### Iteración 1 — Sistema + Hero
- Output: sistema de tokens "Warm Intentionality" + pantalla Home en light/dark.
- Resultado: sistema visual muy bueno, pero con 4 problemas detectados:
  1. Tab bar incluía "Social" (la app es 100% local, sin backend ni sociales)
  2. Header invertía jerarquía: fecha como título principal, nombre como subtítulo
  3. Estado "Misión cumplida" tenía emoji decorativo 🌿 (rompía el brief original)
  4. Faltaba indicador de fuente de datos en Home (requerido por la skill `step-counter`)

### Iteración 2 — Correcciones + dark mode de secundarias
- Output: 4 problemas anteriores corregidos en algunas pantallas + dark mode de Progreso, Ajustes y Simulador.
- Regresiones detectadas:
  1. Ajustes en dark mode introdujo botón "Cerrar Sesión" (la app no tiene login)
  2. Tab "Social" persiste en algunas pantallas (Historial, Ajustes en light)
  3. Pantalla Progreso tiene espacio vacío donde debería ir el chart de barras
  4. Simulador en dark tiene botones cortados al borde, sección "Auto-Walk" en inglés mientras todo el resto está en español
  5. Selector de tema cambia de estilo entre light y dark (debería ser el mismo componente)
  6. Tres archivos de tokens generados (DESIGN.md, tokens.ts, mockups) con valores ligeramente diferentes entre sí

### Decisión de cierre

**No vale la pena seguir iterando en Stitch.** Lo aprendido:
- Builders de IA tienden a romper trabajo previo al iterar
- Cuanto más se itera, más se acumulan inconsistencias
- Es más eficiente cerrar el diseño con criterio claro que perseguir el mockup perfecto

**Decisiones tomadas:**
1. Los tokens del DESIGN.md (Material 3) mandan como fuente de verdad
2. Se consolida en un único `design-system/tokens.ts`
3. Las inconsistencias visuales se resuelven en código con criterio documentado en este documento

Esta es exactamente la decisión que un product manager con experiencia tomaría: **distinguir entre "perfecto" y "suficientemente bueno para implementar bien".**

---

## Decisiones de implementación

Cada sección documenta una ambigüedad o inconsistencia de los mockups y cómo `ui-builder` debe resolverla.

---

### DI-001: Eliminar todas las referencias a autenticación

**Contexto:** Algunos mockups (Ajustes en dark mode) muestran un botón "Cerrar Sesión" en rojo al fondo.

**Decisión:** **No implementar.** StepApp es 100% local, sin cuentas, sin login, sin backend. La pantalla de Ajustes NO debe tener:
- Botón "Cerrar Sesión"
- Sección "Cuenta"
- Avatar como botón de perfil (es decorativo solamente)
- Cualquier flujo de autenticación

**Defensa:** Esto se alinea con la decisión de producto documentada en CLAUDE.md: *"Backend remoto: NO usar. Todo es local. Privacidad del usuario primero."*

---

### DI-002: Tab bar siempre con 3 tabs

**Contexto:** Algunos mockups muestran 4 tabs (Hoy, Progreso, Social, Ajustes), otros 3.

**Decisión:** Implementar siempre **3 tabs:** `Hoy`, `Progreso`, `Ajustes`. La tab "Social" no existe en ninguna pantalla.

**Defensa:** No hay funcionalidad social en el producto. Una tab que llevaría a pantalla vacía o "próximamente" baja la calidad percibida y genera preguntas innecesarias.

---

### DI-003: Selector de tema — componente único con estado activo

**Contexto:** En light, "Claro" se ve con fondo verde sólido. En dark, "Oscuro" se ve con fondo terracota más suave. **Son estilos distintos.**

**Decisión:** Es **un solo componente** (`ThemeSegmentedControl`) con el mismo estilo en ambos modos. Solo cambia cuál segmento está activo:
- Segmento activo: fondo `primary` (verde musgo en ambos modos, derivado del color scheme)
- Segmentos inactivos: fondo `surfaceContainer`
- Texto activo: `onPrimary`
- Texto inactivo: `onSurfaceVariant`

No usar terracota para "Oscuro". El terracota está reservado para logros/streak.

---

### DI-004: Pantalla Progreso — chart de barras es OBLIGATORIO

**Contexto:** El mockup de Progreso (Imagen 7) muestra un espacio en blanco grande donde debería ir el chart. El mockup de Historial anterior (Imagen 2) sí tiene chart.

**Decisión:** Implementar el chart de barras como en la versión Historial:
- 7 barras (una por día de la semana, o N barras según el rango seleccionado)
- Bordes redondeados arriba (`radius.sm` = 8pt)
- Spacing entre barras: `spacing.sm` (8pt) mínimo
- Altura de la barra más alta: ~140pt
- Colores semánticos: `semantic.missionMet` (verde), `semantic.missionMissed` (gris), `semantic.missionWildcard` (terracota)
- Labels de día abajo de cada barra (L, M, X, J, V, S, D)

Si Stitch no entregó este chart en la imagen, NO es señal de que no exista. Es la principal visualización de la pantalla.

---

### DI-005: Tipografía — escala correcta y consistente

**Contexto:** Hay tres "fuentes de verdad" para la tipografía. La oficial es `tokens.ts`.

**Decisión:** Usar exactamente estos tamaños:

| Token | Uso |
|---|---|
| `displayHero` (56pt) | Cifra principal del contador en Home |
| `displayHeroMobile` (40pt) | Variante para pantallas estrechas (< 360pt) |
| `headlineLg` (32pt) | Títulos de pantalla principal ("Progreso", "Ajustes") |
| `headlineMd` (24pt) | "Hola, Martín" en header del Home |
| `bodyLg` (18pt) | Texto importante en cards |
| `bodyMd` (16pt) | Texto general |
| `labelMd` (14pt) | Labels de botones, datos secundarios |
| `labelSm` (12pt) | Micro-text, captions, indicadores de fuente |

**No improvisar tamaños intermedios.** Si necesitas algo entre dos tokens, usa el más cercano.

---

### DI-006: Idioma — todo en español

**Contexto:** El mockup del Simulador en dark muestra "Auto-Walk" en inglés mientras el resto está en español.

**Decisión:** **Todo en español.** Glossary:
- "Auto-Walk" → **"Auto-caminar"** (consistente con el panel del Simulador en light)
- "Wildcard" → **"Comodín"**
- "Streak" → **"Racha"**
- "Mission" → **"Misión"**
- "Steps" → **"Pasos"**

Cualquier texto en inglés visible al usuario debe traducirse. No mezclar idiomas en UI.

---

### DI-007: Panel del Simulador — banner consistente

**Contexto:** El banner "ENTORNO DE DESARROLLO" aparece en light en color terracota (`secondary`) y se ve bien. En dark, se ve más saturado y con texto blanco directo.

**Decisión:** Aplicar siempre:
- Fondo: `palette.light.secondaryContainer` / `palette.dark.secondaryContainer`
- Texto: `palette.light.onSecondaryContainer` / `palette.dark.onSecondaryContainer`
- Texto en `labelSm` con `textTransform: 'uppercase'`
- Padding vertical: `spacing.sm` (8pt)
- Sin radius (banner ocupa el ancho completo)

---

### DI-008: Acciones destructivas — usar `tertiary`, NO rojo puro

**Contexto:** El mockup del Simulador en dark muestra "Resetear Pasos a Cero" en rojo brillante (`#A91E1E` o similar saturado).

**Decisión:** Usar `semantic.destructive` que mapea a `palette.tertiary`. Es un rojo terracota oscuro, alineado con la paleta cálida. **No usar el rojo `error`** (#BA1A1A) salvo para errores reales del sistema (no para acciones destructivas opcionales).

Diferenciación:
- `tertiary` (#983A31) → Acciones destructivas que el usuario inicia con intención (resetear simulador, borrar historial)
- `error` (#BA1A1A) → Errores del sistema (permiso denegado, fuente no disponible)

---

### DI-009: Indicador de fuente de datos en Home

**Contexto:** El mockup final del Home (Imagen 4) muestra un chip `[🏷️ Simulador]` arriba del anillo de progreso. Buena decisión.

**Decisión:** Implementar como componente reutilizable `DataSourceIndicator` que recibe la fuente activa y renderiza:
- `simulated`: chip con texto "Simulador", color `semantic.dataSourceSimulator` (terracota)
- `pedometer`: chip con texto "iPhone", color `semantic.dataSourcePedometer` (verde)
- Estilo: pill con padding pequeño, `labelSm`, ícono opcional

Posición: arriba del anillo, alineado al inicio (izquierda).

---

### DI-010: Header del Home — jerarquía corregida

**Contexto:** Algunos mockups antiguos invertían la jerarquía. La versión final (Imagen 4) ya la corrigió.

**Decisión:** Header del Home siempre con esta estructura:

```
[Avatar 40pt]  Hola, Martín       🔔
               Jueves, 24 de Oct
```

- Avatar: 40pt, circular, decorativo (no clickeable en esta versión)
- "Hola, Martín": `headlineMd`, color `primary`
- Fecha: `bodyMd`, color `onSurfaceVariant`
- Bell (notificaciones): 24pt, color `onSurfaceVariant`
- Alineación: izquierda para el bloque texto, derecha para el bell

**Nota:** En esta versión sin login, el nombre "Martín" es un placeholder de demo. Se puede dejar hardcoded o leer de Settings.

---

### DI-011: Misión cumplida — sin emojis decorativos

**Contexto:** Una iteración tuvo el emoji 🌿. Ya se removió.

**Decisión:** Cuando la misión se cumple, mostrar:
- Card con `surfaceContainerLowest` (blanco)
- Ícono Lucide "Check" o "CheckCircle" en círculo de 40pt, fondo `primary`
- Título: "Misión cumplida" en `headlineMd`
- Descripción: "Has mantenido tu ritmo. Descansa y disfruta del resto del día." en `bodyMd`
- Sin emojis. Sin gradientes. Sin animaciones excesivas.

---

### DI-012: Estado de la fuente — no mostrar cuando no hay ambigüedad

**Contexto:** El indicador "Simulador" es útil durante desarrollo. En producción real con Pedometer, mostrarlo permanentemente sería ruido visual.

**Decisión:** Implementar lógica de visibilidad:
- Si `source === 'simulated'`: **siempre visible** (para que el usuario sepa que es modo dev)
- Si `source === 'pedometer'`: **solo en debug builds**, no en producción
- Si `source === 'healthkit'` (futuro): visible solo si está activo desde Settings

---

### DI-013: Sombras en dark mode

**Contexto:** Las sombras del DESIGN.md son para light mode. En dark, sombras oscuras sobre fondo oscuro no se ven.

**Decisión:** En dark mode, la profundidad se logra por **contraste tonal** entre surfaces (surfaceContainer es más claro que surface), no por sombras. Si se aplican sombras en dark, deben ser muy sutiles:
- `shadowOpacity`: 0.15 max
- `shadowColor`: '#000000'

La preferencia es **no usar sombras en dark**, dejar que la jerarquía la haga el color.

---

### DI-014: Plus Jakarta Sans — fonts a cargar

**Contexto:** Plus Jakarta Sans tiene 8 pesos. No necesitamos todos.

**Decisión:** Cargar via `expo-font` solo estos archivos:

```ts
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
});
```

4 pesos: Regular (400), Medium (500), SemiBold (600), Bold (700). No cargar Italic ni pesos Extra (Light, ExtraBold).

**Descarga:** https://fonts.google.com/specimen/Plus+Jakarta+Sans → Download family

---

## Lista de componentes a construir (priorizada)

### Sprint 1 — Base
1. `ThemeProvider` y hook `useTheme()` — consume `tokens.ts`
2. `Text` — wrapper sobre `<Text>` que aplica variantes tipográficas
3. `Card` — base con padding, radius, sombra
4. `Pressable` con feedback (opacidad pressed)
5. `Pill` — botón pill con variantes primary/secondary

### Sprint 2 — Específicos del Home
6. `ProgressRing` — el anillo principal con cifra centrada
7. `DataSourceIndicator` — chip de fuente activa
8. `MissionCard` — card de misión del día
9. `Header` — con avatar, saludo, fecha y bell
10. `TabBar` — barra inferior de 3 tabs

### Sprint 3 — Pantallas secundarias
11. `BarChart` — gráfico de barras de Progreso
12. `SegmentedControl` — selector Semana/Mes/Año + Sistema/Claro/Oscuro
13. `ListItem` — fila de Ajustes y de historial diario
14. `Toggle` — switch iOS-style

### Sprint 4 — Simulador
15. `SimulatorPanel` — UI del panel completo
16. `StepInjectButton` — botones +100, +500, +1k, +5k
17. `AutoWalkControl` — slider de velocidad + botón iniciar/detener
18. `DestructiveActionButton` — botón rojo terracota

---

## Reglas no negociables para `ui-builder`

1. **NO hardcodear colores en componentes.** Siempre vía `useTheme()`.
2. **NO usar valores fuera del sistema de tokens.** Si necesitas algo distinto, primero discútelo, no inventes.
3. **NO mezclar idiomas en UI.** Todo en español.
4. **NO usar emojis decorativos.** Solo íconos Lucide funcionales.
5. **NO implementar features que no estén en CLAUDE.md.** Cero "Social", cero "Cerrar Sesión", cero gráficos AI.
6. **SÍ verificar dark mode** para cada componente nuevo antes de marcarlo como completo.
7. **SÍ respetar `accessibilityLabel` y touch targets ≥ 44pt.**

---

## Cómo defender esto en la presentación

Cuando alguien pregunte sobre el diseño en la presentación, esta es la narrativa:

> "Para el diseño usé Stitch de Google. Hice dos rondas de iteración. La primera me dio un sistema visual sólido pero con 4 problemas de coherencia con el alcance del producto que detecté en mi revisión. Iteré con feedback específico y la segunda versión resolvió esos 4 pero introdujo regresiones nuevas, como un botón de 'Cerrar Sesión' en una app sin login, layouts cortados, e idioma mezclado. Esto es típico de builders de IA cuando iteras múltiples veces.
>
> En ese punto tomé la decisión que un product manager con experiencia tomaría: cerrar el diseño con criterio documentado en lugar de iterar infinitamente. Generé un `tokens.ts` como fuente única de verdad y un documento de Implementation Notes con 14 decisiones específicas que mi agente `ui-builder` debe resolver en código. Cada decisión está justificada.
>
> El resultado es un sistema más limpio y defendible que un mockup perfecto. **Saber cuándo dejar de iterar es parte del oficio.**"

Esta narrativa demuestra:
- Criterio de producto
- Capacidad de detectar problemas
- Conocimiento del comportamiento de herramientas de IA
- Pragmatismo para avanzar con calidad
- Disciplina de documentación

---

## Archivos relacionados

- `/design-system/tokens.ts` — Fuente única de verdad para tokens
- `/CLAUDE.md` — Memoria global del proyecto (incluye el patrón StepSource)
- `/.claude/agents/ui-builder.md` — Rol del agente que va a implementar esto
- `/README.md` — Sección "Arquitectura de IA"

---

## Changelog

- 2026-05-26: Documento inicial. Diseño cerrado tras 2 iteraciones en Stitch.
