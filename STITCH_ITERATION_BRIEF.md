# Brief de Iteración para Stitch
## StepApp — Ajustes obligatorios antes de implementación

Este brief asume que ya tienes el diseño base en Stitch ("Warm Intentionality").
Aquí están los cambios concretos a aplicar antes de pasar a código.

---

## CAMBIOS OBLIGATORIOS

### Cambio 1: Tab bar de 4 tabs → 3 tabs

**Problema:** Actualmente la tab bar muestra "Social" pero la app no tiene 
funcionalidad social (es 100% local, sin backend).

**Acción:** Eliminar completamente la tab "Social" de todas las pantallas.

**Nueva tab bar (3 items):**
1. **Hoy** — pantalla principal con contador y misión
2. **Progreso** — historial de pasos y misiones
3. **Ajustes** — configuración

Mantén el resto del estilo de tab bar igual (ícono + label, color primary 
para activo, etc.).

---

### Cambio 2: Header del Home — jerarquía corregida

**Problema:** La fecha "24 de Octubre" aparece como título principal del 
header, compitiendo visualmente con la cifra de pasos.

**Acción:** Reestructurar el header de la pantalla Home así:

```
┌────────────────────────────────────────────┐
│  [avatar]  Hola, Martín              🔄 🔔 │
│            Jueves, 24 de Octubre           │
└────────────────────────────────────────────┘
```

- "Hola, Martín" en **headline-md** (24px, SemiBold)
- "Jueves, 24 de Octubre" en **label-md** o **body-md** (14-16px, Regular, 
  color `on-surface-variant`)
- Alineación: izquierda (no centrado)
- Avatar circular pequeño a la izquierda
- Íconos de refresh y notificación a la derecha

La cifra de pasos en el centro del anillo sigue siendo el elemento más grande 
de la pantalla.

---

### Cambio 3: Eliminar emoji decorativo del estado "Misión cumplida"

**Problema:** El estado "Misión cumplida" muestra "Has mantenido tu ritmo. 
Descansa y disfruta del resto del día 🌿". El emoji rompe el sistema 
(el brief original prohibía emojis decorativos).

**Acción:** 

Opción A (mi preferida): Quitar el emoji y dejar el copy limpio:
> "Has mantenido tu ritmo. Descansa y disfruta del resto del día."

Opción B: Reemplazar el emoji por un ícono Lucide pequeño (icono "Leaf") en 
color `primary`, alineado al inicio del texto:
> 🌿 (icono Leaf) Has mantenido tu ritmo. Descansa y disfruta del resto del día.

Aplica también a cualquier otro emoji decorativo que haya quedado en otras 
pantallas. Mantén los íconos funcionales (estrella de comodín, llama de 
racha, etc.).

---

### Cambio 4: Indicador de fuente de datos en pantalla Home

**Problema:** Solo la pantalla del Simulador muestra de dónde vienen los datos.
La pantalla Home debería indicarlo también (es un requisito de diseño del 
sistema).

**Acción:** Agregar un indicador sutil en la pantalla Home que muestre la 
fuente activa de datos. 

Opciones de implementación (elige la que mejor se integre):

**Opción A:** Chip pequeño debajo del anillo, junto a la métrica de distancia:
```
[🏷️ Simulador]  |  4.5 km  |  320 kcal
```

**Opción B:** Texto micro debajo de "pasos hoy" dentro del anillo:
```
        4,521
       pasos hoy
    Fuente: Simulador
```
(en label-sm, color on-surface-variant)

**Opción C:** Ícono pequeño en el header, junto al botón de refresh, con 
un dot indicator de color (verde para Pedometer, gris para Simulator).

Mi recomendación: **Opción A** — un chip discreto pero visible. Es más 
honesto sobre el origen del dato y le da peso a tu decisión arquitectónica.

---

## RECONCILIACIÓN DE TOKENS (importante)

Los tokens declarados en el DESIGN.md son la **fuente de verdad**. 
Los mockups deben respetarlos exactamente.

**Verifica y corrige:**

| Token | Valor declarado | Aplicarlo a |
|---|---|---|
| `primary` | `#446139` | Todos los acentos verdes principales |
| `primary-container` | `#5C7A50` | Versión más clara para fondos |
| `secondary` | `#8D4E1F` | Acentos terracota (streak, comodín usado) |
| `secondary-container` | `#FEAB74` | Versión más clara terracota |
| `surface` | `#FFF8F3` | Fondo principal |
| `surface-container` | `#F3EDE7` | Cards levemente diferenciadas del fondo |
| `surface-container-lowest` | `#FFFFFF` | Cards blancas (mission card) |
| `on-surface` | `#1D1B18` | Texto principal |
| `on-surface-variant` | `#43483F` | Texto secundario |
| `outline-variant` | `#C3C8BC` | Bordes sutiles |

**Tipografía: verifica que se usen estos tamaños exactos:**
- Display Hero: **56px** (no 48, no 64)
- Headline Large: 32px
- Headline Medium: 24px
- Body Large: 18px
- Body Medium: 16px
- Label Medium: 14px

---

## DARK MODE: pantallas faltantes

**Acción:** Generar dark mode para las 3 pantallas secundarias:

1. **Progreso (Historial)** — incluyendo el chart de barras y la lista de días
2. **Ajustes** — incluyendo todas las secciones
3. **Simulador** — incluyendo el banner de "entorno de desarrollo"

**Reglas para el dark mode:**

- Fondo principal: `#1A1816` (no negro puro, mantener warmth)
- Surface container: `#252320`
- Surface container high: `#2F2C29`
- Texto principal: `#F5F1EA`
- Texto secundario: `#A09B92`
- Primary: usar `inverse-primary` `#AFD09F` (más luminoso que el primary de light)
- Secondary: versión más clara, alrededor de `#FFB688`
- Outlines: muy sutiles, `#353230`

**Importante:**
- Las sombras en dark mode deben ser MÁS sutiles (la profundidad se logra 
  por contraste tonal entre surfaces, no por sombras)
- El banner del simulador "ENTORNO DE DESARROLLO" debe mantener su color 
  terracota pero con la saturación ajustada al dark mode

---

## CHECKLIST DE VALIDACIÓN

Antes de exportar la versión final, verifica:

- [ ] Tab bar tiene 3 tabs: Hoy, Progreso, Ajustes (NO Social)
- [ ] Header del Home muestra "Hola, Martín" como title, no la fecha
- [ ] La fecha está en posición secundaria en el header
- [ ] Ningún emoji decorativo aparece en pantallas de producto
- [ ] Pantalla Home muestra la fuente de datos (chip "Simulador" o similar)
- [ ] Todos los colores coinciden exactamente con los tokens del DESIGN.md
- [ ] Display Hero es 56px en desktop y 40px en mobile
- [ ] Dark mode existe para: Home, Progreso, Ajustes, Simulador
- [ ] El selector de tema (Sistema/Claro/Oscuro) sigue presente en Ajustes
- [ ] Estado "Misión cumplida" no tiene emoji 🌿

---

## ENTREGABLES FINALES

Cuando termines, exporta:

1. **Mockups finales** de todas las pantallas, en light y dark, como PNG
2. **DESIGN.md actualizado** (si los tokens cambiaron, lo cual no debería)
3. **stepapp_component_specs.md** actualizado (si especificaste algún 
   componente nuevo)
4. **Resumen del proyecto** para referencia

Comparte todo conmigo para continuar con el setup del proyecto en Claude Code.
