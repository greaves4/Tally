/**
 * StepApp — Design Tokens
 * Sistema: "Warm Intentionality"
 *
 * FUENTE DE VERDAD ÚNICA.
 *
 * Este archivo es la única fuente de verdad para tokens visuales del proyecto.
 * Donde los mockups difieran de estos valores, gana el token.
 *
 * Reglas:
 * - No hardcodear colores en componentes. Importar siempre desde aquí.
 * - No agregar tokens nuevos sin documentarlo en /design-system/CHANGELOG.md.
 * - Si un componente necesita un valor que no existe, primero proponer agregarlo aquí.
 */

// =====================================================================
// COLORES (Material 3 — Warm Intentionality)
// =====================================================================

export const palette = {
  light: {
    // Surfaces (capa base hacia capas elevadas)
    surface: '#FFF8F3',
    surfaceDim: '#DFD9D4',
    surfaceBright: '#FFF8F3',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F9F2ED',
    surfaceContainer: '#F3EDE7',
    surfaceContainerHigh: '#EDE7E2',
    surfaceContainerHighest: '#E7E1DC',

    // On-surface (texto e íconos sobre surfaces)
    onSurface: '#1D1B18',
    onSurfaceVariant: '#43483F',

    // Inverso (para tooltips, snackbars, etc.)
    inverseSurface: '#32302D',
    inverseOnSurface: '#F6F0EA',
    inversePrimary: '#AFD09F',

    // Outline
    outline: '#73796E',
    outlineVariant: '#C3C8BC',

    // Primary — Moss Green (verde musgo)
    primary: '#446139',
    onPrimary: '#FFFFFF',
    primaryContainer: '#5C7A50',
    onPrimaryContainer: '#E9FFDB',

    // Secondary — Terracotta (logros, racha, comodín)
    secondary: '#8D4E1F',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FEAB74',
    onSecondaryContainer: '#783D0F',

    // Tertiary — Clay (alertas suaves)
    tertiary: '#983A31',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#B85247',
    onTertiaryContainer: '#FFF6F4',

    // Error
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',

    // Background (alias de surface por compatibilidad)
    background: '#FFF8F3',
    onBackground: '#1D1B18',
  },

  dark: {
    surface: '#1A1816',
    surfaceDim: '#1A1816',
    surfaceBright: '#403D3A',
    surfaceContainerLowest: '#141312',
    surfaceContainerLow: '#22201E',
    surfaceContainer: '#262422',
    surfaceContainerHigh: '#312F2C',
    surfaceContainerHighest: '#3C3A37',

    onSurface: '#F5F1EA',
    onSurfaceVariant: '#C7C2BA',

    inverseSurface: '#F5F1EA',
    inverseOnSurface: '#32302D',
    inversePrimary: '#446139',

    outline: '#8E948A',
    outlineVariant: '#43483F',

    primary: '#AFD09F',
    onPrimary: '#1A300F',
    primaryContainer: '#324E28',
    onPrimaryContainer: '#CAECB9',

    secondary: '#FFB688',
    onSecondary: '#532500',
    secondaryContainer: '#703708',
    onSecondaryContainer: '#FFDBC7',

    tertiary: '#FFB4AA',
    onTertiary: '#5F1410',
    tertiaryContainer: '#802821',
    onTertiaryContainer: '#FFDAD5',

    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',

    background: '#1A1816',
    onBackground: '#F5F1EA',
  },
} as const;

// =====================================================================
// TIPOGRAFÍA
// =====================================================================

export const typography = {
  fontFamily: 'PlusJakartaSans',  // cargado via expo-font

  displayHero: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 56,
    fontWeight: '700' as const,
    lineHeight: 64,
    letterSpacing: -1.12,  // -0.02em ≈ -1.12 a 56px
  },

  displayHeroMobile: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -0.8,
  },

  headlineLg: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -0.32,
  },

  headlineMd: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  bodyLg: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  bodyMd: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },

  labelMd: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.28,
  },

  labelSm: {
    fontFamily: 'PlusJakartaSans-Medium',
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
  sm: 8,    // chips, badges
  md: 16,   // cards estándar
  lg: 24,   // cards grandes, modales
  xl: 32,   // pantalla principal del contador
  full: 9999,  // pills, avatares
} as const;

// =====================================================================
// SOMBRAS (sutiles, nunca dramáticas)
// =====================================================================
// En React Native, las sombras se aplican distinto en iOS vs Android.
// Estos valores están optimizados para iOS.

export const shadows = {
  card: {
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,  // Android
  },
  elevated: {
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,  // Android
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
    // En React Native usamos los nombres de easing de Reanimated
    standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

// =====================================================================
// SEMANTIC TOKENS (mapeo de significado, no de color crudo)
// =====================================================================
// Estos son los que SIEMPRE usan los componentes. Los componentes
// nunca importan `palette.primary` directamente; importan `semantic.success`.

export const semantic = {
  light: {
    // Estados de misiones
    missionMet: palette.light.primary,           // verde musgo
    missionMissed: palette.light.outlineVariant, // gris cálido
    missionWildcard: palette.light.secondary,    // terracota

    // Datos del contador
    counterPrimary: palette.light.primary,
    counterTrack: palette.light.surfaceContainerHigh,

    // Indicador de fuente de datos
    dataSourceSimulator: palette.light.secondary,
    dataSourcePedometer: palette.light.primary,

    // Streak y comodín
    streakActive: palette.light.primary,
    streakWildcard: palette.light.secondary,

    // Acciones destructivas (en panel de simulador)
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
  colors: typeof palette.light;
  semantic: typeof semantic.light;
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

// Token "default" para imports rápidos en utilidades puras
// (NO usar en componentes; usar el hook useTheme en su lugar)
export const tokens = {
  palette,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  semantic,
} as const;
