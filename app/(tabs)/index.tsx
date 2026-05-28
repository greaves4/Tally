import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/base/Text';
import { BalanceStrip } from '@/components/features/BalanceStrip';
import { CelebrationOverlay } from '@/components/features/CelebrationOverlay';
import { ShareCard } from '@/components/features/ShareCard';
import { DataSourceIndicator } from '@/components/features/DataSourceIndicator';
import { HomeHeader } from '@/components/features/HomeHeader';
import { MissionCard } from '@/components/features/MissionCard';
import { ProgressRing } from '@/components/features/ProgressRing';
import { StreakBadge } from '@/components/features/StreakBadge';
import { WildcardBadge } from '@/components/features/WildcardBadge';
import { useTheme } from '@/design-system/useTheme';
import { useDailyMission } from '@/hooks/useDailyMission';
import { useDailyStepReset } from '@/hooks/useDailyStepReset';
import { useStepDebt } from '@/hooks/useStepDebt';
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
  const { status: debtStatus, balance: debtBalance, effectiveGoalToday } = useStepDebt(stepsToday);
  const {
    todayMission,
    progress: missionProgress,
    isCompleted,
    streakState,
    isReady: missionReady,
  } = useDailyMission();

  // ── Compartir ───────────────────────────────────────────────────────────────
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleSharePress = async (): Promise<void> => {
    if (isSharing || !shareCardRef.current) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      console.warn('[share] failed:', e);
    } finally {
      setIsSharing(false);
    }
  };

  // ── Celebración ────────────────────────────────────────────────────────────
  const [celebrating, setCelebrating] = useState(false);
  // Trackea el templateId + estado completado de la misión vista por última vez.
  // Celebrar solo cuando el MISMO templateId pasa de !completed → completed,
  // lo que evita disparar la animación al arranque si la misión ya estaba lista.
  const prevMissionRef = useRef<{ templateId: string | null; completed: boolean }>({
    templateId: null,
    completed: false,
  });
  const ringScale = useSharedValue(1);

  useEffect(() => {
    if (!missionReady) return;

    const templateId = todayMission?.templateId ?? null;
    const prev = prevMissionRef.current;

    console.log('[Celebration] isCompleted:', isCompleted, 'templateId:', templateId, 'prevCompleted:', prev.completed, 'prevTemplateId:', prev.templateId);

    if (prev.templateId === null) {
      // Primera vez que el hook carga: inicializar sin celebrar.
      prevMissionRef.current = { templateId, completed: isCompleted };
      return;
    }

    if (templateId === prev.templateId && !prev.completed && isCompleted) {
      console.log('[Celebration] FIRING');
      prevMissionRef.current = { templateId, completed: true };
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 2500);
      return () => clearTimeout(timer);
    }

    prevMissionRef.current = { templateId, completed: isCompleted };
  }, [isCompleted, missionReady, todayMission]);

  useEffect(() => {
    if (celebrating) {
      ringScale.value = withSequence(
        withSpring(1.08, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 150 }),
      );
    }
  }, [celebrating, ringScale]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

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
        <HomeHeader
          userName={USER_NAME}
          currentDate={new Date()}
          onSharePress={() => { void handleSharePress(); }}
          shareDisabled={isSharing}
        />

        <View style={badgesRowStyle}>
          <StreakBadge streakCount={streakState.current} />
          <WildcardBadge wildcardsAvailable={streakState.wildcardsAvailable} />
        </View>

        <Animated.View style={[ringSectionStyle, ringAnimatedStyle]}>
          <DataSourceIndicator source={source} />
          <ProgressRing currentSteps={ringCurrent} goalSteps={ringGoal}>
            <Text variant="displayHeroMobile" color="counterPrimary">
              {stepsReady ? stepsToday.toLocaleString('es-AR') : '…'}
            </Text>
            <Text variant="labelSm" color="onSurfaceVariant">
              PASOS
            </Text>
          </ProgressRing>
        </Animated.View>

        <BalanceStrip
          kind={debtStatus}
          balance={debtBalance}
          effectiveGoalToday={effectiveGoalToday}
        />

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
      <CelebrationOverlay celebrating={celebrating} />

      {/* ShareCard fuera de pantalla: solo se renderiza para captura con ViewShot */}
      <View
        ref={shareCardRef}
        collapsable={false}
        style={{ position: 'absolute', top: -10000, left: 0, pointerEvents: 'none' }}
      >
        <ShareCard
          stepsToday={stepsToday}
          missionTitle={missionTitle}
          isCompleted={isCompleted}
          progress={missionProgress}
          streakCount={streakState.current}
          date={new Date()}
        />
      </View>
    </View>
  );
}
