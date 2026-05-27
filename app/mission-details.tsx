import { Fragment } from 'react';
import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, X } from 'lucide-react-native';
import { Card } from '@/components/base/Card';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import { useDailyMission } from '@/hooks/useDailyMission';
import type { MissionParams } from '@/features/missions/types';

/**
 * Tips curados por tipo de misión.
 */
const TIPS_BY_TYPE: Record<MissionParams['type'], string> = {
  TOTAL_STEPS:
    'Distribuye la actividad durante el día. Una caminata corta de mañana, otra a media tarde y movimiento incidental cubren la mayor parte.',
  STEPS_BEFORE_TIME:
    'Aprovecha la mañana. Bajarte una parada antes, subir escaleras o una caminata al café cercano suman rápido.',
  STEPS_AFTER_TIME:
    'Una caminata digestiva al cierre del día. Mejora el descanso y suelta tensión acumulada.',
  BEAT_AVERAGE:
    'Hoy ve un poco más allá de tu promedio. Una pausa activa de 10 minutos más que ayer suele alcanzar.',
  CONSECUTIVE_BLOCKS:
    'Reparte la actividad en pausas activas a lo largo del día. Programa recordatorios cada par de horas si te ayuda.',
  NO_ZERO_HOURS:
    'Cada hora del horario laboral cuenta. Levántate aunque sean 30 segundos: ir al baño, llenar el vaso de agua o asomarte a la ventana cuentan.',
  STREAK_PROTECTION:
    'Hoy se vale poco. Una caminata corta basta para mantener la racha viva sin esforzarte.',
};

const CLOSE_BUTTON_SIZE = 44;

/** Card con barra de progreso visual. */
function ProgressBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 1);

  const trackStyle: ViewStyle = {
    height: 8,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  };

  const fillStyle: ViewStyle = {
    width: `${Math.round(clamped * 100)}%`,
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  };

  return (
    <View
      style={trackStyle}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
    >
      <View style={fillStyle} />
    </View>
  );
}

export default function MissionDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todayMission, progress, isCompleted, isReady } = useDailyMission();

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
  };

  // Header custom fijo arriba (no scrollea). Reemplaza el header del Stack
  // para tener control total del comportamiento en modal presentation y
  // garantizar que el close esté siempre visible.
  const headerStyle: ViewStyle = {
    paddingTop: insets.top + theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  };

  const closeButtonStyle: ViewStyle = {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  };

  const headerTitleWrapStyle: ViewStyle = {
    flex: 1,
    alignItems: 'center',
  };

  /** Spacer del lado derecho para mantener el título centrado ópticamente. */
  const headerSpacerStyle: ViewStyle = {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
  };

  const contentStyle: ViewStyle = {
    padding: theme.spacing.lg,
    paddingBottom: insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  const completedHeaderStyle: ViewStyle = {
    alignItems: 'center',
    gap: theme.spacing.md,
  };

  const checkCircleWrapStyle: ViewStyle = {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  };

  let body: React.ReactNode;
  if (!isReady) {
    body = (
      <Text variant="bodyMd" color="onSurfaceVariant">
        Cargando misión…
      </Text>
    );
  } else if (todayMission === null) {
    body = (
      <Text variant="bodyMd" color="onSurfaceVariant">
        Sin misión disponible hoy.
      </Text>
    );
  } else if (isCompleted) {
    body = (
      <Fragment>
        <View style={completedHeaderStyle}>
          <View style={checkCircleWrapStyle}>
            <CheckCircle color={theme.colors.onPrimary} size={32} />
          </View>
          <Text variant="headlineLg">Misión cumplida</Text>
        </View>
        <Card>
          <Text variant="bodyLg">{todayMission.description}</Text>
        </Card>
      </Fragment>
    );
  } else {
    const tip = TIPS_BY_TYPE[todayMission.params.type];
    body = (
      <Fragment>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="headlineLg" color="primary">
            {todayMission.title}
          </Text>
          <Text variant="bodyLg" color="onSurface">
            {todayMission.description}
          </Text>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelMd" color="onSurfaceVariant">
            Progreso
          </Text>
          <ProgressBar progress={progress} />
          <Text variant="labelSm" color="onSurfaceVariant">
            {Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%
          </Text>
        </View>

        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="labelMd" color="primary">
              Sugerencia
            </Text>
            <Text variant="bodyMd">{tip}</Text>
          </View>
        </Card>
      </Fragment>
    );
  }

  return (
    <Fragment>
      {/* Header del Stack oculto: renderizamos uno custom debajo. */}
      <Stack.Screen
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <View style={screenStyle}>
        <View style={headerStyle}>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Cerrar detalle de misión"
            accessibilityRole="button"
            style={closeButtonStyle}
            hitSlop={8}
          >
            <X color={theme.colors.onSurface} size={24} />
          </Pressable>
          <View style={headerTitleWrapStyle}>
            <Text variant="labelMd">Detalle de misión</Text>
          </View>
          <View style={headerSpacerStyle} />
        </View>
        <ScrollView contentContainerStyle={contentStyle}>{body}</ScrollView>
      </View>
    </Fragment>
  );
}
