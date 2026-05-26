import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/design-system/useTheme';
import type { Theme } from '@/design-system/tokens';

/**
 * Variantes tipográficas disponibles. Cada una mapea 1:1 a una entrada de
 * `theme.typography`. La fuente de verdad es `design-system/tokens.ts`.
 */
export type TextVariant =
  | 'displayHero'
  | 'displayHeroMobile'
  | 'headlineLg'
  | 'headlineMd'
  | 'bodyLg'
  | 'bodyMd'
  | 'labelMd'
  | 'labelSm';

/**
 * Claves de color admitidas para el prop `color`. Resolución:
 * 1. Primero se busca en `theme.colors`.
 * 2. Si no, en `theme.semantic`.
 *
 * Verificado por mobile-dev: no hay colisiones de llaves entre ambos namespaces.
 */
export type ThemeColorKey = keyof Theme['colors'] | keyof Theme['semantic'];

export type TextProps = RNTextProps & {
  variant: TextVariant;
  color?: ThemeColorKey;
};

function resolveColor(theme: Theme, key: ThemeColorKey): string {
  if (key in theme.colors) {
    return theme.colors[key as keyof Theme['colors']];
  }
  return theme.semantic[key as keyof Theme['semantic']];
}

export function Text({ variant, color = 'onSurface', style, ...rest }: TextProps) {
  const theme = useTheme();
  const variantStyle = theme.typography[variant];

  const baseStyle: TextStyle = {
    fontFamily: variantStyle.fontFamily,
    fontSize: variantStyle.fontSize,
    fontWeight: variantStyle.fontWeight,
    lineHeight: variantStyle.lineHeight,
    letterSpacing: variantStyle.letterSpacing,
    color: resolveColor(theme, color),
  };

  return <RNText {...rest} style={[baseStyle, style]} />;
}
