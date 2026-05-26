# Brief de Diseño — StepApp
## Para usar con Claude (chat / artifacts)

Este documento contiene tres briefs separados para iterar el diseño de StepApp en rondas.

**Cómo usarlo:**
1. Copia el contenido de "RONDA 1" en un chat nuevo de Claude. Pídele que genere el artifact.
2. Revisa y ajusta hasta que el sistema de diseño te convenza.
3. En el mismo chat, copia "RONDA 2" para la pantalla principal.
4. Finalmente, copia "RONDA 3" para las pantallas secundarias.

**No pegues todo de una vez.** El control por rondas te permite ajustar antes de avanzar.

---

# RONDA 1 — Sistema de diseño + pantalla hero

```
Voy a construir una app móvil iOS llamada StepApp. Es una app de conteo de pasos 
con un sistema de misiones diarias para crear hábitos sostenibles. No es Strava 
ni Whoop. Es una app calmada, intencional, no agresiva.

Necesito que diseñes el SISTEMA DE DISEÑO completo + UNA pantalla hero que lo 
demuestre. No diseñes más pantallas aún, las veremos después.

## CONTEXTO DEL PRODUCTO

- App móvil iOS (React Native + Expo)
- Audiencia: personas que quieren mover más sin presión, no atletas
- Tono: cálido, calmado, motivador sin ser demandante
- Diferenciador: misiones diarias variadas con streak protegido por comodín semanal
- Decisión clave: NO competimos con apps deportivas duras. Somos la app amable.

## DIRECCIÓN ESTILÍSTICA

Wellness cálido. Tipo Oura/Calm pero para pasos. Sostenible, intencional, 
con warmth. Anti-bro-fitness.

## SISTEMA DE TOKENS A GENERAR

### Paleta (light mode)
- Fondo principal: #F7F4EE (off-white cálido)
- Superficie elevada (cards): #FFFFFF
- Texto principal: #1F1D1A (casi negro, cálido)
- Texto secundario: #6B6863 (gris cálido)
- Acento primario: #5C7A50 (verde musgo, ni neón ni saturado)
- Acento de logro: #C77D4A (terracota cálido, para streak)
- Borde sutil: #E8E3DA
- Éxito: #5C7A50
- Advertencia: #C77D4A
- Error: #A8463C (rojo terracota, NO rojo saturado)

### Paleta (dark mode)
- Fondo principal: #1A1816 (no negro puro)
- Superficie elevada: #252320
- Texto principal: #F5F1EA
- Texto secundario: #A09B92
- Acento primario: #7FA070 (verde más claro)
- Acento de logro: #E09766 (terracota más claro)
- Borde sutil: #353230

### Tipografía
- Font family: Plus Jakarta Sans (toda la familia)
- Display (números enormes del contador): 64pt, Bold, line-height 1.0, tracking -2%
- Title 1: 28pt, SemiBold, line-height 1.2
- Title 2: 22pt, SemiBold, line-height 1.25
- Body Large: 17pt, Regular, line-height 1.4
- Body: 15pt, Regular, line-height 1.45
- Caption: 13pt, Medium, line-height 1.3
- Micro: 11pt, Medium, line-height 1.3, uppercase con tracking +5%

### Spacing (escala 4pt)
- xs: 4
- sm: 8
- md: 16
- lg: 24
- xl: 32
- xxl: 48
- xxxl: 64

### Radius
- sm: 8 (chips, badges)
- md: 16 (cards estándar)
- lg: 24 (cards grandes, modales)
- xl: 32 (pantalla principal del contador)
- full: 9999 (botones pill, avatares)

### Sombras (sutiles, nunca dramáticas)
- card: 0 1px 3px rgba(31, 29, 26, 0.04), 0 4px 8px rgba(31, 29, 26, 0.04)
- elevated: 0 2px 6px rgba(31, 29, 26, 0.06), 0 8px 16px rgba(31, 29, 26, 0.06)

### Duraciones (animaciones)
- fast: 150ms
- normal: 250ms
- slow: 400ms
- easing por defecto: cubic-bezier(0.25, 0.1, 0.25, 1)

## PRINCIPIOS DE DISEÑO (aplicarlos en todo)

1. UNA cifra protagonista por pantalla. Todo lo demás es subordinado visualmente.
2. Mucho aire. Spacing generoso entre bloques (mínimo 24pt entre secciones).
3. Cero gradientes agresivos. A lo mucho, un sutil gradiente radial en el anillo de progreso.
4. Cero íconos saturados de color. Íconos en texto secundario, no acentuados.
5. Bordes redondeados generosos. Nunca esquinas afiladas excepto en charts.
6. Animaciones suaves, nunca abruptas. Easing siempre.
7. Sin emojis decorativos. Si se usa un símbolo, que sea funcional (íconos de Lucide o SF Symbols).
8. Sin "hype copy". Nada de "¡INCREÍBLE!" o "🔥". El tono es directo, amable, adulto.

## PANTALLA HERO A DISEÑAR

Diseña la PANTALLA PRINCIPAL (Home) que muestra:
- Saludo simple arriba ("Hola" + opcional fecha)
- Anillo de progreso circular GRANDE en el centro:
  - Cifra de pasos enorme en el centro (ej: 6,432)
  - Pequeño texto debajo de la cifra: "pasos hoy"
  - El anillo se llena según el progreso hacia la misión del día
- Debajo del anillo, una CARD de la misión del día:
  - Título corto de la misión (ej: "Camina 8,000 pasos antes de las 6pm")
  - Descripción breve (1 línea)
  - Indicador de progreso (barra horizontal o porcentaje)
- En la parte baja, una fila con dos elementos pequeños:
  - Streak actual con ícono de llama o similar SUTIL (ej: "7 días")
  - Indicador de comodín disponible (ej: "1 comodín esta semana")

## ENTREGABLE ESPERADO

Un artifact HTML que muestre:
1. El sistema completo de tokens (visualmente, no solo en código)
2. La pantalla Home en tamaño iPhone 15 Pro (393 × 852pt)
3. Mostrar AMBAS versiones: light mode y dark mode lado a lado

## RESTRICCIONES TÉCNICAS

- Se renderizará en React Native, así que no uses CSS exclusivo de web 
  (no backdrop-filter, no clip-path complejo, no SVG con filtros complejos)
- Tipografías deben ser Plus Jakarta Sans (cargada vía Google Fonts)
- Considera safe area de iPhone (notch arriba, home indicator abajo)
- Touch targets mínimos de 44pt
- Todo debe verse bien en pantallas de 375pt (iPhone SE) hasta 430pt (iPhone Pro Max)
```

---

# RONDA 2 — Pantalla principal detallada con estados

```
Excelente, el sistema de diseño aprobado. Ahora necesito la pantalla Home 
COMPLETA con todos sus estados.

## ESTADOS A DISEÑAR

Diseña la pantalla Home en TRES estados distintos, lado a lado:

### Estado 1: Primer launch del día (recién amaneció)
- Pasos: 0 o muy pocos (ej: 47)
- Anillo de progreso casi vacío
- Misión del día recién generada, sin progreso
- Streak: si viene de antes, muestra el número. Si es usuario nuevo, no mostrar.

### Estado 2: Día en progreso (mediodía)
- Pasos: ~4,500
- Anillo a la mitad
- Misión con progreso ~50%
- Streak visible

### Estado 3: Misión completada (tarde)
- Pasos: ~8,200
- Anillo lleno con un sutil glow verde musgo
- Misión marcada como completada (check + texto "Misión cumplida 🌿")
- Streak incrementado con micro-celebración (sin ser ridícula)
- Mensaje motivacional sutil debajo

## INTERACCIONES CLAVE

Muestra visualmente:
1. Cómo se ve el tap en la card de misión (estado pressed con opacidad 0.7)
2. Cómo se vería un long-press en el anillo (muestra tooltip pequeño con detalle)
3. Indicador visual de "fuente de los datos" (en este momento: 'simulado' con ícono pequeño)

## ELEMENTOS QUE FALTABAN EN RONDA 1

Agrega:
- Tab bar inferior con 3 tabs: Home (actual), Historial, Settings
- Pull-to-refresh visual hint (chevron sutil arriba)

## ENTREGABLE

Tres pantallas (los 3 estados) lado a lado en light mode.
Una versión adicional del Estado 2 en dark mode para validar contraste.
```

---

# RONDA 3 — Pantallas secundarias

```
Perfecto. Última ronda: las pantallas secundarias.

## PANTALLA: HISTORIAL

Una vista que muestra el historial de pasos del usuario.

### Estructura
- Header: "Historial" + selector de rango (Semana / Mes / Año)
- Resumen arriba: promedio diario del rango seleccionado + comparativa con período anterior
- Chart de barras simple, una barra por día (no usar líneas, son menos legibles para días)
  - Color: verde musgo cuando se cumplió misión, gris cálido cuando no, terracota cuando se usó comodín
- Lista debajo del chart: por cada día, una fila con:
  - Fecha
  - Pasos totales
  - Indicador de estado (cumplido / fallido / comodín usado)
  - Tap revela detalle (qué misión era)

### Diseño
- Usar el mismo sistema de tokens
- El chart respeta los principios: barras redondeadas arriba, spacing generoso
- Estado vacío: si el usuario tiene menos de 3 días de datos, mostrar mensaje 
  "Necesitamos un par de días más para mostrarte tu historial. Sigue caminando."

## PANTALLA: SETTINGS

Lista vertical de opciones agrupadas en secciones.

### Secciones

**Sección 1: Notificaciones**
- Toggle: "Recordatorio de misión" (default: on)
- Texto descriptivo pequeño: "Te avisaremos a las 8pm si aún no completas tu misión del día"

**Sección 2: Apariencia**
- Selector: Tema (Sistema / Claro / Oscuro)

**Sección 3: Modo desarrollo** (solo visible si __DEV__)
- Toggle: "Simulador activo"
- Botón: "Abrir panel del simulador"
- Texto descriptivo: "El simulador genera pasos sintéticos para desarrollo. 
  Se ocultará automáticamente en producción."

**Sección 4: Acerca de**
- Link: "Política de privacidad"
- Link: "Código abierto" (opcional)
- Texto: versión de la app

### Diseño
- Cada sección con un título micro en uppercase con tracking
- Filas con altura mínima de 56pt (touch target cómodo)
- Toggles a la derecha
- Separadores muy sutiles entre filas
- Mucha calma. No es un panel de configuración técnica, es minimalista.

## PANTALLA: PANEL DEL SIMULADOR

Esta es una pantalla de DEV, no es producción. Debe verse claramente como herramienta.

### Estructura

**Header**
- Título: "Simulador"
- Subtítulo pequeño: "Genera pasos sintéticos para desarrollo y demo"
- Banner sutil de advertencia: "Esta pantalla no aparece en producción"

**Sección 1: Estado actual**
- Cifra grande: pasos generados hoy por el simulador
- Texto: "fuente activa: SimulatedStepSource"

**Sección 2: Agregar pasos manualmente**
- Cuatro botones grandes en grid 2x2: [+100] [+500] [+1,000] [+5,000]
- Botón ancho debajo: "Personalizado..." (abre un input)

**Sección 3: Auto-caminar**
- Selector de velocidad: Lento (10/s) | Normal (30/s) | Rápido (100/s)
- Botón ancho: "Iniciar" o "Detener" según estado
- Indicador visual cuando está activo (punto verde pulsante)

**Sección 4: Acciones destructivas**
- Botón: "Resetear pasos del día" (estilo destructivo, terracota)
- Botón: "Borrar todo el historial del simulador" (estilo muy destructivo, rojo)

### Diseño
- Debe verse claramente como dev tool: usar un sutil patrón de fondo o un borde 
  distintivo que indique "esto no es producción"
- Mantener tokens del design system para consistencia, pero permitir algo de 
  "información densa" que no se vería en pantallas de producto

## ENTREGABLE FINAL

Las 3 pantallas (Historial, Settings, Panel del Simulador) en light mode, 
una al lado de la otra.

Recordatorio: todo respeta el sistema de tokens de la Ronda 1, sin excepciones.
```

---

# Apéndice: Cómo iterar si algo no funciona

Si después de una ronda el resultado no te convence, no le pidas a Claude que 
"haga otra versión completa". En lugar de eso, sé específico:

**Mal:** "Hazlo más bonito"
**Bien:** "El anillo se siente pequeño. Aumenta su diámetro un 20% y reduce 
el espacio de la card de misión a la mitad."

**Mal:** "No me gusta el color"
**Bien:** "El verde musgo se ve apagado en dark mode. Sube su luminosidad 
un 10% solo en dark, mantenlo igual en light."

**Mal:** "Cambia todo"
**Bien:** "Mantén el sistema de tokens y la composición. Cambia solo la 
tipografía del display de Plus Jakarta Sans a Space Grotesk para ver cómo se ve."

Iterar con precisión > pedir variaciones masivas.

---

# Después de la Ronda 3

Cuando tengas las pantallas aprobadas, exporta:

1. **Los tokens** (en formato TS para `design-system/tokens.ts`)
2. **Las capturas** de las pantallas como referencia visual para Claude Code
3. **Especificaciones de cualquier componente reutilizable** (botones, cards, chips)

Esto es lo que le pasarás a `ui-builder` cuando empiece la implementación.
