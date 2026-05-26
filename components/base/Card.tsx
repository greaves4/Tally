import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useThemeContext } from '@/design-system/useTheme';

export type CardVariant = 'default' | 'elevated';

export type CardProps = ViewProps & {
  variant?: CardVariant;
};

/**
 * Card base sobre `View`. Aplica:
 *  - backgroundColor: `surfaceContainerLowest`
 *  - borderRadius: `radius.md`
 *  - padding: `spacing.md` (override-able vía `style`)
 *  - sombra según `variant`
 *
 * DI-013: En `scheme === 'dark'` no se aplican sombras. La jerarquía visual
 * la da el contraste tonal entre surfaces.
 */
export function Card({ variant = 'default', style, children, ...rest }: CardProps) {
  const { theme, scheme } = useThemeContext();

  const shadow = scheme === 'dark'
    ? null
    : variant === 'elevated'
      ? theme.shadows.elevated
      : theme.shadows.card;

  const baseStyle: ViewStyle = {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...(shadow ?? {}),
  };

  return (
    <View {...rest} style={[baseStyle, style]}>
      {children}
    </View>
  );
}
