import { View, type ViewStyle } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

/**
 * Props del badge de racha.
 *
 * `streakCount` es el número de días consecutivos cumplidos. 0 cuando aún
 * no hay racha activa.
 */
export type StreakBadgeProps = {
  streakCount: number;
};

const ICON_SIZE = 14;

/**
 * Chip pill que muestra la racha actual del usuario.
 *
 * - `streakCount > 0`: colores cálidos `primaryContainer` (verde musgo suave)
 *   y texto "N días" (singular "1 día" cuando aplica).
 * - `streakCount === 0`: tono neutro atenuado y texto "Sin racha".
 *
 * Sigue el patrón visual de `DataSourceIndicator` (DI-009): pill horizontal,
 * sin emojis (DI-011), texto en español (DI-006).
 */
export function StreakBadge({ streakCount }: StreakBadgeProps) {
  const theme = useTheme();

  const hasStreak = streakCount > 0;

  const backgroundColor = hasStreak
    ? theme.colors.primaryContainer
    : theme.colors.surfaceContainer;

  const foregroundColor = hasStreak
    ? theme.colors.onPrimaryContainer
    : theme.colors.onSurfaceVariant;

  const label = hasStreak
    ? `${streakCount} ${streakCount === 1 ? 'día' : 'días'}`
    : 'Sin racha';

  const accessibilityLabel = hasStreak
    ? `Racha actual: ${streakCount} ${streakCount === 1 ? 'día' : 'días'}`
    : 'Sin racha activa';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor,
  };

  return (
    <View
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Flame size={ICON_SIZE} color={foregroundColor} />
      <Text variant="labelSm" style={{ color: foregroundColor }}>
        {label}
      </Text>
    </View>
  );
}
