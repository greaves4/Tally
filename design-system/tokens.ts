/**
 * Tally — Design Tokens
 * Sistema: "Dark-first / Accent Lime"
 *
 * FUENTE DE VERDAD ÚNICA.
 *
 * Reglas:
 * - No hardcodear colores en componentes. Importar siempre desde aquí.
 * - No agregar tokens nuevos sin documentarlo en /design-system/CHANGELOG.md.
 * - Si un componente necesita un valor que no existe, primero proponer agregarlo aquí.
 */

// =====================================================================
// COLORES
// =====================================================================

export const palette = {
  light: {
    // Surfaces — paleta cálida crema/blanco
    surface: '#FFFFFF',
    surfaceDim: '#EAE6DE',
    surfaceBright: '#FFFFFF',
    surfaceContainerLowest: '#FDFCFA',
    surfaceContainerLow: '#F4F1EB',
    surfaceContainer: '#EDE9E1',
    surfaceContainerHigh: '#E5E0D7',
    surfaceContainerHighest: '#DDD7CC',

    // On-surface
    onSurface: '#1A1A1A',
    onSurfaceVariant: '#8A7E6E',

    // Inverso
    inverseSurface: '#1E1E1E',
    inverseOnSurface: '#F4F4F1',
    inversePrimary: '#C5F04A',

    // Outline
    outline: '#8A7E6E',
    outlineVariant: '#E0D9CE',

    // Primary — verde bosque
    primary: '#3D6B1E',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D4E8BC',
    onPrimaryContainer: '#1A3A08',

    // Secondary — tierra cálida
    secondary: '#8A7E6E',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EDE3D6',
    onSecondaryContainer: '#3D3020',

    // Tertiary — terracota (acciones destructivas)
    tertiary: '#C4622D',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FAD5B8',
    onTertiaryContainer: '#5C1A00',

    // Error
    error: '#B5363B',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    // Background
    background: '#F4F1EB',
    onBackground: '#1A1A1A',
  },

  dark: {
    surface: '#1E1E1E',
    surfaceDim: '#151515',
    surfaceBright: '#2C2C2C',
    surfaceContainerLowest: '#0D0D0D',
    surfaceContainerLow: '#151515',
    surfaceContainer: '#1A1A1A',
    surfaceContainerHigh: '#252525',
    surfaceContainerHighest: '#2C2C2C',

    onSurface: '#F4F4F1',
    onSurfaceVariant: '#888888',

    inverseSurface: '#F4F4F1',
    inverseOnSurface: '#1E1E1E',
    inversePrimary: '#C5F04A',

    outline: '#666666',
    outlineVariant: '#222222',

    primary: '#C5F04A',
    onPrimary: '#0A0A0A',
    primaryContainer: '#D8F77D',
    onPrimaryContainer: '#0A0A0A',

    secondary: '#888888',
    onSecondary: '#F4F4F1',
    secondaryContainer: '#252525',
    onSecondaryContainer: '#F4F4F1',

    tertiary: '#983A31',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#B85247',
    onTertiaryContainer: '#FFF6F4',

    error: '#CF6679',
    onError: '#FFFFFF',
    errorContainer: '#5C0000',
    onErrorContainer: '#FFDAD6',

    background: '#151515',
    onBackground: '#F4F4F1',
  },
} as const;

// =====================================================================
// TIPOGRAFÍA — Inter
// =====================================================================

export const typography = {
  fontFamily: 'Inter',

  displayHero: {
    fontFamily: 'Inter_700Bold',
    fontSize: 56,
    fontWeight: '700' as const,
    lineHeight: 64,
    letterSpacing: -1.12,
  },

  displayHeroMobile: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -0.8,
  },

  headlineLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -0.32,
  },

  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },

  labelMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.28,
  },

  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.36,
  },
} as const;

// =====================================================================
// SPACING (escala base 4pt)
// =====================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// =====================================================================
// RADIUS
// =====================================================================

export const radius = {
  sm: 8,
  md: 16,     // card
  lg: 24,
  xl: 32,     // icon / counter ring
  button: 12,
  full: 9999, // pill / avatar
} as const;

// =====================================================================
// SOMBRAS
// =====================================================================

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// =====================================================================
// ANIMACIONES
// =====================================================================

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

// =====================================================================
// SEMANTIC TOKENS
// =====================================================================

export const semantic = {
  light: {
    missionMet: palette.light.primary,
    missionMissed: palette.light.outlineVariant,
    missionWildcard: palette.light.secondary,

    counterPrimary: palette.light.primary,
    counterTrack: palette.light.surfaceContainerHigh,

    dataSourceSimulator: palette.light.secondary,
    dataSourcePedometer: palette.light.primary,

    streakActive: palette.light.primary,
    streakWildcard: palette.light.secondary,

    destructive: palette.light.tertiary,
    onDestructive: palette.light.onTertiary,
  },
  dark: {
    missionMet: palette.dark.primary,
    missionMissed: palette.dark.outlineVariant,
    missionWildcard: palette.dark.secondary,

    counterPrimary: palette.dark.primary,
    counterTrack: palette.dark.surfaceContainerHigh,

    dataSourceSimulator: palette.dark.secondary,
    dataSourcePedometer: palette.dark.primary,

    streakActive: palette.dark.primary,
    streakWildcard: palette.dark.secondary,

    destructive: palette.dark.tertiary,
    onDestructive: palette.dark.onTertiary,
  },
} as const;

// =====================================================================
// TIPO EXPORTADO PARA USO EN HOOK useTheme
// =====================================================================

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  colors: (typeof palette)[ColorScheme];
  semantic: (typeof semantic)[ColorScheme];
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  animation: typeof animation;
};

export function getTheme(scheme: ColorScheme): Theme {
  return {
    colors: palette[scheme],
    semantic: semantic[scheme],
    typography,
    spacing,
    radius,
    shadows,
    animation,
  };
}

export const tokens = {
  palette,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  semantic,
} as const;
