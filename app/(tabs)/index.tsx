import { ScrollView, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/base/Text';
import { DataSourceIndicator } from '@/components/features/DataSourceIndicator';
import { HomeHeader } from '@/components/features/HomeHeader';
import { MissionCard } from '@/components/features/MissionCard';
import { ProgressRing } from '@/components/features/ProgressRing';
import { StreakBadge } from '@/components/features/StreakBadge';
import { WildcardBadge } from '@/components/features/WildcardBadge';
import { useTheme } from '@/design-system/useTheme';
import { useDailyMission } from '@/hooks/useDailyMission';
import { useDailyStepReset } from '@/hooks/useDailyStepReset';
import { useStepsToday } from '@/hooks/useStepsToday';
import type { MissionParams } from '@/features/missions/types';

/**
 * Meta visual por defecto del anillo cuando no hay misión cargada o cuando
 * el tipo de misión no aporta una meta numérica directa (ej: NO_ZERO_HOURS,
 * CONSECUTIVE_BLOCKS). El anillo necesita una referencia para dibujar el
 * progreso; este valor solo se usa como denominador estético — el progreso
 * real lo manda `useDailyMission.progress`.
 */
const GOAL_STEPS = 8000;

const USER_NAME = 'Gerry';

/**
 * Deriva `(currentSteps, goalSteps)` para `ProgressRing` a partir de la
 * misión del día y los pasos reales del usuario.
 *
 * Estrategia:
 * - TOTAL_STEPS: ring directo sobre `target`.
 * - STREAK_PROTECTION: ring sobre `maxSteps` (mínimo a alcanzar).
 * - BEAT_AVERAGE: ring sobre `reference` (o `GOAL_STEPS` si es 0).
 * - Resto (BEFORE/AFTER/CONSECUTIVE/NO_ZERO): el `progress` del hook ya es
 *   la fuente fiel del avance, pero el ring necesita una meta numérica.
 *   Compromiso visual: usamos `GOAL_STEPS` como meta y reconstruimos
 *   `currentSteps` desde `progress` para que el ring refleje correctamente
 *   el porcentaje real reportado por el hook.
 */
function deriveRingValues(
  missionParams: MissionParams | null,
  stepsToday: number,
  missionProgress: number,
): { currentSteps: number; goalSteps: number } {
  if (missionParams === null) {
    return { currentSteps: stepsToday, goalSteps: GOAL_STEPS };
  }

  switch (missionParams.type) {
    case 'TOTAL_STEPS':
      return { currentSteps: stepsToday, goalSteps: missionParams.target };
    case 'STREAK_PROTECTION':
      return { currentSteps: stepsToday, goalSteps: missionParams.maxSteps };
    case 'BEAT_AVERAGE': {
      const goal = missionParams.reference > 0 ? missionParams.reference : GOAL_STEPS;
      return { currentSteps: stepsToday, goalSteps: goal };
    }
    case 'STEPS_BEFORE_TIME':
    case 'STEPS_AFTER_TIME':
    case 'CONSECUTIVE_BLOCKS':
    case 'NO_ZERO_HOURS': {
      // Para estos tipos, el "progreso real" lo manda el hook (sabe contar
      // horas, bloques, ventanas temporales). Reconstruimos currentSteps
      // contra GOAL_STEPS para que el ring muestre el mismo porcentaje.
      const currentSteps = Math.round(missionProgress * GOAL_STEPS);
      return { currentSteps, goalSteps: GOAL_STEPS };
    }
  }
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useDailyStepReset();
  const { stepsToday, source, isReady: stepsReady } = useStepsToday();
  const {
    todayMission,
    progress: missionProgress,
    isCompleted,
    streakState,
    isReady: missionReady,
  } = useDailyMission();

  // Mientras la misión no esté lista, el anillo refleja pasos crudos contra
  // GOAL_STEPS. Cuando la misión carga, los valores reales toman efecto.
  const { currentSteps: ringCurrent, goalSteps: ringGoal } = missionReady
    ? deriveRingValues(todayMission?.params ?? null, stepsToday, missionProgress)
    : { currentSteps: stepsToday, goalSteps: GOAL_STEPS };

  const missionTitle = todayMission?.title ?? 'Cargando misión...';
  const missionDescription = todayMission?.description ?? '';

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: insets.top,
  };

  // El tab bar nativo del bottom navigator se asienta sobre el safe area inferior.
  // Sumamos `insets.bottom` + `spacing.xl` para que la MissionCard tenga aire
  // antes del tab bar en iPhone con notch / Home Indicator.
  const contentStyle: ViewStyle = {
    paddingBottom: insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  const badgesRowStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  };

  const ringSectionStyle: ViewStyle = {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  };

  const metricsRowStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  };

  const metricStyle: ViewStyle = {
    alignItems: 'center',
    gap: theme.spacing.xs,
  };

  const missionSectionStyle: ViewStyle = {
    paddingHorizontal: theme.spacing.lg,
  };

  return (
    <View style={screenStyle}>
      <ScrollView contentContainerStyle={contentStyle}>
        <HomeHeader userName={USER_NAME} currentDate={new Date()} />

        <View style={badgesRowStyle}>
          <StreakBadge streakCount={streakState.current} />
          <WildcardBadge wildcardsAvailable={streakState.wildcardsAvailable} />
        </View>

        <View style={ringSectionStyle}>
          <DataSourceIndicator source={source} />
          <ProgressRing currentSteps={ringCurrent} goalSteps={ringGoal}>
            <Text variant="displayHeroMobile" color="counterPrimary">
              {stepsReady ? stepsToday.toLocaleString('es-AR') : '…'}
            </Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              PASOS
            </Text>
          </ProgressRing>
        </View>

        <View style={metricsRowStyle}>
          <View style={metricStyle}>
            <Text variant="headlineMd">{Math.round(stepsToday * 0.04)}</Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              Calorías
            </Text>
          </View>
          <View style={metricStyle}>
            <Text variant="headlineMd">{(stepsToday * 0.00078).toFixed(1)} km</Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              Distancia
            </Text>
          </View>
        </View>

        <View style={missionSectionStyle}>
          <MissionCard
            title={missionTitle}
            description={missionDescription}
            progress={missionProgress}
            completed={isCompleted}
            onPress={() => router.push('/mission-details')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
