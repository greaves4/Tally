import { View, type ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

/**
 * Props del badge del comodín.
 *
 * `wildcardsAvailable` es la cantidad de comodines disponibles (0 o 1 en esta
 * versión, regenerados cada lunes).
 */
export type WildcardBadgeProps = {
  wildcardsAvailable: number;
};

const ICON_SIZE = 14;

/**
 * Chip pill que muestra si el usuario tiene comodín disponible para proteger
 * la racha esta semana.
 *
 * - `wildcardsAvailable > 0`: terracota suave (`secondaryContainer`),
 *   alineada con la paleta de "logros" del sistema (DI-009 / streakWildcard).
 * - `wildcardsAvailable === 0`: tono neutro atenuado, texto "Sin comodín".
 *
 * Glossary (DI-006): "Wildcard" → "Comodín".
 */
export function WildcardBadge({ wildcardsAvailable }: WildcardBadgeProps) {
  const theme = useTheme();

  const hasWildcard = wildcardsAvailable > 0;

  const backgroundColor = hasWildcard
    ? theme.colors.secondaryContainer
    : theme.colors.surfaceContainer;

  const foregroundColor = hasWildcard
    ? theme.colors.onSecondaryContainer
    : theme.colors.onSurfaceVariant;

  const label = hasWildcard ? 'Comodín disponible' : 'Sin comodín';

  const accessibilityLabel = hasWildcard
    ? 'Comodín semanal disponible'
    : 'Sin comodín disponible esta semana';

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
      <Star size={ICON_SIZE} color={foregroundColor} />
      <Text variant="labelSm" style={{ color: foregroundColor }}>
        {label}
      </Text>
    </View>
  );
}
