import { useEffect } from 'react';
import { Dimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COLORS = ['#C5F04A', '#FFFFFF', '#3D6B1E'] as const;
const PARTICLE_COUNT = 20;
const FALL_DURATION_MS = 1800;

type ParticleConfig = {
  id: number;
  xFraction: number;
  delay: number;
  color: string;
  width: number;
  height: number;
  initialRotation: number;
};

// Configuración estática generada una vez al cargar el módulo.
const PARTICLE_CONFIGS: readonly ParticleConfig[] = Array.from(
  { length: PARTICLE_COUNT },
  (_, i) => ({
    id: i,
    xFraction: Math.random(),
    delay: Math.floor(Math.random() * 600),
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] ?? '#C5F04A',
    width: Math.random() > 0.5 ? 8 : 6,
    height: Math.random() > 0.5 ? 8 : 12,
    initialRotation: Math.floor(Math.random() * 360),
  }),
);

// ─── ConfettiParticle ──────────────────────────────────────────────────────

type ParticleProps = {
  active: boolean;
  config: ParticleConfig;
};

function ConfettiParticle({ active, config }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withDelay(
        config.delay,
        withTiming(1, { duration: FALL_DURATION_MS, easing: Easing.in(Easing.quad) }),
      );
    }
  }, [active, config.delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const y = progress.value * (SCREEN_HEIGHT + 40) - 20;
    const spin = config.initialRotation + progress.value * 540;
    const opacity = progress.value > 0.75 ? 1 - (progress.value - 0.75) / 0.25 : 1;
    return {
      transform: [{ translateY: y }, { rotate: `${spin}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.xFraction * SCREEN_WIDTH,
          top: 0,
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── CelebrationOverlay ────────────────────────────────────────────────────

export type CelebrationOverlayProps = {
  celebrating: boolean;
};

export function CelebrationOverlay({ celebrating }: CelebrationOverlayProps) {
  const theme = useTheme();
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(16);

  useEffect(() => {
    if (celebrating) {
      textOpacity.value = 0;
      textTranslateY.value = 16;
      // Fade in → hold → fade out (total ~1.5s)
      textOpacity.value = withSequence(
        withTiming(1, { duration: 350 }),
        withDelay(800, withTiming(0, { duration: 350 })),
      );
      textTranslateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [celebrating, textOpacity, textTranslateY]);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const overlayStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  const textContainerStyle: ViewStyle = {
    position: 'absolute',
    // Aproximadamente debajo del ProgressRing (≈52 % desde el tope).
    top: SCREEN_HEIGHT * 0.52,
    left: 0,
    right: 0,
    alignItems: 'center',
  };

  return (
    <View style={overlayStyle} pointerEvents="none">
      {PARTICLE_CONFIGS.map((config) => (
        <ConfettiParticle key={config.id} active={celebrating} config={config} />
      ))}
      <Animated.View style={[textContainerStyle, textAnimatedStyle]}>
        <Text
          variant="bodyLg"
          style={{ fontFamily: 'Inter_700Bold', color: theme.colors.primary }}
        >
          ¡Misión cumplida!
        </Text>
      </Animated.View>
    </View>
  );
}
