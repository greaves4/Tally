import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeContext } from '@/design-system/useTheme';
import type { CardVariant } from './Card';

/**
 * Props del PressableCard. `onPress` y `accessibilityLabel` son obligatorios
 * (regla de accesibilidad). El touch target mínimo se asegura por
 * `minHeight`/`minWidth` de 44pt.
 */
export type PressableCardProps = Omit<
  PressableProps,
  'onPress' | 'accessibilityLabel' | 'style'
> & {
  variant?: CardVariant;
  onPress: NonNullable<PressableProps['onPress']>;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

const MIN_TOUCH_TARGET = 44;

/**
 * Versión accionable de Card. Mismos estilos base + estado pressed con
 * opacidad reducida. Respeta DI-013: sin sombras en dark mode.
 */
export function PressableCard({
  variant = 'default',
  onPress,
  accessibilityLabel,
  style,
  children,
  ...rest
}: PressableCardProps) {
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
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    ...(shadow ?? {}),
  };

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [baseStyle, pressed ? { opacity: 0.7 } : null, style]}
    >
      {children}
    </Pressable>
  );
}
