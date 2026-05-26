import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/base/Text';
import { DataSourceIndicator } from '@/components/features/DataSourceIndicator';
import { HomeHeader } from '@/components/features/HomeHeader';
import { MissionCard } from '@/components/features/MissionCard';
import { ProgressRing } from '@/components/features/ProgressRing';
import { useTheme } from '@/design-system/useTheme';
import { useDailyStepReset } from '@/hooks/useDailyStepReset';
import { useStepsToday } from '@/hooks/useStepsToday';

// TODO Sprint 4: estos valores serán dinámicos (meta = misión del día, métricas
// calculadas desde pasos reales). Por ahora hardcoded para validar la UI.
const GOAL_STEPS = 8000;
const MISSION_GOAL_STEPS = 5000;
const USER_NAME = 'Martín';
const MOCK_CALORIES = 312;
const MOCK_DISTANCE_KM = 2.4;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useDailyStepReset();
  const { stepsToday, source, isReady } = useStepsToday();

  const missionProgress = Math.min(Math.max(stepsToday / MISSION_GOAL_STEPS, 0), 1);
  const missionCompleted = stepsToday >= MISSION_GOAL_STEPS;

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

        <View style={ringSectionStyle}>
          <DataSourceIndicator source={source} />
          <ProgressRing currentSteps={stepsToday} goalSteps={GOAL_STEPS}>
            <Text variant="displayHeroMobile" color="counterPrimary">
              {isReady ? stepsToday.toLocaleString('es-AR') : '…'}
            </Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              PASOS
            </Text>
          </ProgressRing>
        </View>

        <View style={metricsRowStyle}>
          <View style={metricStyle}>
            <Text variant="headlineMd">{MOCK_CALORIES}</Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              Calorías
            </Text>
          </View>
          <View style={metricStyle}>
            <Text variant="headlineMd">{MOCK_DISTANCE_KM.toLocaleString('es-AR')} km</Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              Distancia
            </Text>
          </View>
        </View>

        <View style={missionSectionStyle}>
          <MissionCard
            title="Misión Diaria"
            description={
              missionCompleted
                ? 'Has mantenido tu ritmo. Descansa y disfruta del resto del día.'
                : 'Completa 5.000 pasos antes del mediodía para mantener tu racha activa y asegurar tu progreso semanal.'
            }
            progress={missionProgress}
            completed={missionCompleted}
            onPress={() => {
              // TODO Sprint 4: navegar al detalle de la misión.
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
