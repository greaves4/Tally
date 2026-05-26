import { View, type ViewStyle } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { PressableCard } from '@/components/base/PressableCard';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

const PROGRESS_BAR_HEIGHT = 8;
const COMPLETED_ICON_CIRCLE_SIZE = 40;
const COMPLETED_ICON_SIZE = 24;
const CHEVRON_SIZE = 16;

export type MissionCardProps = {
  title: string;
  description: string;
  /** 0–1. Se clampea internamente. Ignorado cuando `completed === true`. */
  progress: number;
  onPress: () => void;
  /** DI-011: cuando true, muestra el estado "Misión cumplida" sin emojis. */
  completed?: boolean;
};

/**
 * Card de la misión del día.
 *
 * - Estado normal: título + descripción + barra de progreso + footer "Ver Detalles".
 * - Estado completado (DI-011): círculo con check, copy fijo "Misión cumplida",
 *   y el `description` que pase el consumer como mensaje de éxito.
 *   Sin emojis, sin gradientes, sin animaciones excesivas.
 */
export function MissionCard({
  title,
  description,
  progress,
  onPress,
  completed = false,
}: MissionCardProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    gap: theme.spacing.sm,
  };

  const accessibilityLabel = completed
    ? `Misión cumplida: ${description}`
    : `Misión: ${title}`;

  if (completed) {
    const iconCircleStyle: ViewStyle = {
      width: COMPLETED_ICON_CIRCLE_SIZE,
      height: COMPLETED_ICON_CIRCLE_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    };

    return (
      <PressableCard
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={containerStyle}
      >
        <View style={iconCircleStyle}>
          <Check size={COMPLETED_ICON_SIZE} color={theme.colors.onPrimary} />
        </View>
        <Text variant="headlineMd" color="onSurface">
          Misión cumplida
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {description}
        </Text>
      </PressableCard>
    );
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const progressTrackStyle: ViewStyle = {
    height: PROGRESS_BAR_HEIGHT,
    width: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
  };

  const progressFillStyle: ViewStyle = {
    height: '100%',
    width: `${clampedProgress * 100}%`,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  };

  const footerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: theme.spacing.xs,
  };

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={containerStyle}
    >
      <Text variant="headlineMd" color="primary">
        {title}
      </Text>
      <Text variant="bodyMd" color="onSurface">
        {description}
      </Text>
      <View
        style={progressTrackStyle}
        accessibilityRole="progressbar"
        accessibilityValue={{
          now: Math.round(clampedProgress * 100),
          min: 0,
          max: 100,
        }}
      >
        <View style={progressFillStyle} />
      </View>
      <View style={footerStyle}>
        <Text variant="labelMd" color="primary">
          Ver Detalles
        </Text>
        <ChevronRight size={CHEVRON_SIZE} color={theme.colors.primary} />
      </View>
    </PressableCard>
  );
}
