import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/useTheme';

/**
 * Wrapper animado de `Circle` de react-native-svg. Permite que Reanimated
 * actualice `strokeDashoffset` en el hilo de UI sin re-render del árbol.
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_ROTATION_DEG = -90;
const ANIMATION_DURATION_MS = 600;
const DEFAULT_SIZE = 280;
const DEFAULT_STROKE_WIDTH = 12;
const COMPLETED_GLOW_OPACITY = 0.15;
const COMPLETED_GLOW_EXTRA_STROKE = 6;
const COMPLETED_PROGRESS_OPACITY = 0.95;

export type ProgressRingProps = {
  currentSteps: number;
  goalSteps: number;
  /** Diámetro en pt. */
  size?: number;
  /** Grosor del anillo en pt. */
  strokeWidth?: number;
  /** Contenido centrado (cifra, etiquetas, etc). No bloquea toques. */
  children?: React.ReactNode;
};

/**
 * Anillo circular con progreso animado.
 *
 * - Track + progreso en SVG.
 * - Progreso animado vía Reanimated (strokeDashoffset).
 * - Cuando se completa la meta, se agrega un "glow" sutil (sin filtros SVG,
 *   que no son confiables cross-platform).
 *
 * a11y: expone role `progressbar` con `now`/`min`/`max`.
 */
export function ProgressRing({
  currentSteps,
  goalSteps,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  children,
}: ProgressRingProps) {
  const theme = useTheme();

  const safeGoal = goalSteps > 0 ? goalSteps : 1;
  const clampedProgress = Math.min(Math.max(currentSteps / safeGoal, 0), 1);
  const isCompleted = currentSteps >= goalSteps && goalSteps > 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const offset = useSharedValue(circumference);

  useEffect(() => {
    offset.value = withTiming(circumference * (1 - clampedProgress), {
      duration: ANIMATION_DURATION_MS,
    });
  }, [circumference, clampedProgress, offset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  const wrapperStyle: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const centerStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View
      style={wrapperStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={`${currentSteps} de ${goalSteps} pasos`}
      accessibilityValue={{ now: currentSteps, min: 0, max: goalSteps }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: `${RING_ROTATION_DEG}deg` }] }}
      >
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.surfaceContainerHigh}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Glow extra cuando se completa la meta */}
        {isCompleted ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth + COMPLETED_GLOW_EXTRA_STROKE}
            strokeLinecap="round"
            fill="transparent"
            opacity={COMPLETED_GLOW_OPACITY}
          />
        ) : null}

        {/* Progreso */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          opacity={isCompleted ? COMPLETED_PROGRESS_OPACITY : 1}
          animatedProps={animatedProps}
        />
      </Svg>

      <View style={centerStyle} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}
