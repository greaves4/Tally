---
name: daily-missions
description: Usar al trabajar con el sistema de misiones diarias, generación de misiones desde el catálogo, evaluación de cumplimiento, lógica de streak, o uso del comodín semanal. Aplica para todo lo relacionado con motivación gamificada, catálogo de plantillas de misión, y persistencia del progreso del streak. NO usar para el contador de pasos base (esa es step-counter) ni para UI de las misiones (esa es ui-builder).
---

# Skill: Daily Missions

## Cuándo aplicar esta skill

Aplica cuando el trabajo involucre:

- Catálogo de plantillas de misión (definir, agregar, modificar tipos)
- Motor que evalúa si la misión del día se cumplió
- Lógica de selección de la misión diaria (algoritmo de variedad)
- Cálculo y persistencia del streak
- Lógica del comodín semanal
- Notificaciones relacionadas con misiones (recordatorio antes de medianoche)

## Filosofía del sistema

**El problema que resuelve:** Las apps de pasos típicas tienen una sola meta diaria (10,000 pasos). Esto es aburrido, descontextualizado, y desmotivador cuando no se cumple. Los usuarios desinstalan después de fallar 3 días seguidos.

**Nuestra solución:** Misiones variadas, cortas, con un streak protegido por un comodín semanal. La misión cambia cada día, viene de un catálogo curado, y siempre es alcanzable para el usuario promedio.

**Principios:**
1. **Variedad sobre dificultad.** Una misión fácil pero distinta cada día es mejor que un objetivo grande repetido.
2. **Streak resiliente.** Un mal día no debe destruir semanas de progreso.
3. **Contexto local.** La misión usa los datos del usuario (su promedio, su horario) para personalizarse.
4. **Transparencia.** El usuario siempre sabe qué tiene que hacer y por qué se cumplió o no.

## Tipos de misión en el catálogo

```ts
type MissionType =
  | 'TOTAL_STEPS'           // "Camina X pasos hoy"
  | 'STEPS_BEFORE_TIME'     // "Camina X pasos antes de las HH:MM"
  | 'STEPS_AFTER_TIME'      // "Camina X pasos después de las HH:MM"
  | 'BEAT_AVERAGE'          // "Supera tu promedio de los últimos 7 días"
  | 'CONSECUTIVE_BLOCKS'    // "Haz N bloques de M pasos separados por al menos T minutos"
  | 'NO_ZERO_HOURS'         // "Que ninguna hora del día activa tenga 0 pasos"
  | 'STREAK_PROTECTION';    // "Solo camina X pasos, hoy se vale poco"
```

Cada tipo tiene:
- Una **plantilla** de copy (con placeholders)
- Una **función de evaluación** pura: `(stepsToday: DayData) => boolean`
- Una **dificultad calibrada** (1-5) que se ajusta al promedio del usuario

## Estructura de una misión

```ts
type MissionTemplate = {
  id: string;
  type: MissionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  generateInstance: (userContext: UserContext) => MissionInstance;
};

type MissionInstance = {
  templateId: string;
  date: string;              // 'YYYY-MM-DD'
  title: string;             // copy generado con valores reales
  description: string;
  evaluate: (data: DayData) => boolean;
  params: Record<string, unknown>; // valores específicos del día
};

type UserContext = {
  weeklyAverage: number;
  recentMissions: string[];  // IDs de últimos 7 días, para evitar repetir
  preferredActiveHours?: { start: number; end: number };
};
```

## Algoritmo de selección diaria

```
Cada día a las 00:00 local (o al primer launch del día):
1. Obtener UserContext (promedio semanal, últimas misiones, etc.)
2. Filtrar catálogo: remover plantillas usadas en los últimos 3 días
3. Calibrar dificultad: si streak > 7, permitir dificultad 3-5. Si streak < 3, solo 1-3.
4. Seleccionar pseudo-aleatoriamente del subset
5. Generar instancia con valores específicos del usuario
6. Guardar en tabla missions_daily
```

## Persistencia

```sql
CREATE TABLE IF NOT EXISTS missions_daily (
  date TEXT PRIMARY KEY,           -- 'YYYY-MM-DD'
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  params TEXT NOT NULL,            -- JSON
  completed INTEGER NOT NULL,      -- 0 | 1
  completed_at TEXT,               -- ISO timestamp, null si no
  used_wildcard INTEGER NOT NULL   -- 0 | 1
);

CREATE TABLE IF NOT EXISTS streak_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- siempre 1 row
  current_streak INTEGER NOT NULL,
  longest_streak INTEGER NOT NULL,
  wildcards_available INTEGER NOT NULL,    -- 0 o 1, regenera lunes
  last_wildcard_regen TEXT NOT NULL,       -- 'YYYY-MM-DD' del lunes que regeneró
  last_evaluated_date TEXT                 -- último día evaluado
);
```

## Lógica del comodín

```
Cada lunes a las 00:00 (o primer launch del lunes):
  if last_wildcard_regen != monday_actual:
    wildcards_available = 1
    last_wildcard_regen = monday_actual

Al evaluar un día (al cierre o al abrir la app del día siguiente):
  if mission_completed:
    streak += 1
  elif wildcards_available > 0:
    wildcards_available -= 1
    used_wildcard = 1 para esa misión
    streak += 1  # streak se mantiene
  else:
    streak = 0
```

## Casos edge

1. **Usuario abre la app después de 5 días.** Evalúa cada uno de los 5 días en orden. Si tenía streak de 10, sin comodín, falla el primer día sin completar, streak se rompe.
2. **Misión generada pero usuario nunca abrió la app.** Se evalúa con los datos de pasos que tengamos en SQLite para ese día.
3. **Promedio semanal = 0 (usuario nuevo).** Para los primeros 7 días, usa misiones fijas de tipo `TOTAL_STEPS` con valores bajos (2,000-5,000). Después calibra con datos reales.
4. **En modo simulador, el usuario puede manipular datos pasados.** El sistema debe ser determinístico: dado un set de datos, la evaluación siempre da el mismo resultado.

## Notificaciones

Una sola notificación por día, opcional, a las 20:00 hora local:
- Si la misión NO está cumplida: "Te faltan X pasos para completar tu misión de hoy 🚶"
- Si SÍ está cumplida: nada (no molestar)
- Si NO hay datos suficientes: nada

## Qué NO hacer

- ❌ No generes misiones aleatoriamente sin catálogo. Imposibles o tontas matan la experiencia.
- ❌ No castigues al usuario nuevo con misiones imposibles. Calibra después de tener datos.
- ❌ No bombardees con notificaciones. Una al día, máximo.
- ❌ No persistas la función `evaluate` en SQLite. Persiste los `params` y reconstruye `evaluate` desde el `templateId` al cargar.
- ❌ No acoples la evaluación a un `StepSource` específico. La evaluación lee del estado persistido en SQLite, que ya fue alimentado por el source actual.

## Cómo verificar que funcionó

1. Genera una misión manualmente (botón de debug en dev): debe aparecer
2. Usa el simulador para agregar pasos hasta cumplirla
3. La misión debe marcarse como completada y el streak subir
4. Simula no cumplir: streak baja a 0 (o usa wildcard si disponible)
5. Cambia la fecha al próximo lunes: wildcard debe regenerarse
6. Verifica que dos lunes seguidos no regeneren dos veces el wildcard
