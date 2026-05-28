import { Pressable, View, type ViewStyle } from 'react-native';
import { Bell, Share2, Swords } from 'lucide-react-native';
import { Svg, Line } from 'react-native-svg';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

const AVATAR_SIZE = 40;
const BELL_ICON_SIZE = 24;
const BELL_TOUCH_TARGET = 44;
const BELL_HIT_SLOP = (BELL_TOUCH_TARGET - BELL_ICON_SIZE) / 2;

export type HomeHeaderProps = {
  userName: string;
  currentDate: Date;
  onSharePress?: () => void;
  shareDisabled?: boolean;
  onChallengePress?: () => void;
};

function formatLocalizedDate(date: Date): string {
  const raw = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const first = raw.charAt(0).toUpperCase();
  const rest = raw.slice(1);
  return `${first}${rest}`;
}

function TallyIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Line x1="8"  y1="10" x2="8"  y2="46" stroke={color} strokeWidth={5} strokeLinecap="round"/>
      <Line x1="20" y1="10" x2="20" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round"/>
      <Line x1="32" y1="10" x2="32" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round"/>
      <Line x1="44" y1="10" x2="44" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round"/>
      <Line x1="2"  y1="44" x2="50" y2="12" stroke={color} strokeWidth={5} strokeLinecap="round"/>
    </Svg>
  );
}

export function HomeHeader({ userName, currentDate, onSharePress, shareDisabled, onChallengePress }: HomeHeaderProps) {
  const theme = useTheme();

  const formattedDate = formatLocalizedDate(currentDate);

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  };

  const leftBlockStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexShrink: 1,
  };

  const avatarStyle: ViewStyle = {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textBlockStyle: ViewStyle = {
    flexShrink: 1,
  };

  const rightRowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  };

  const iconPressableStyle: ViewStyle = {
    minWidth: BELL_TOUCH_TARGET,
    minHeight: BELL_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const handleBellPress = (): void => {};

  return (
    <View style={containerStyle}>
      <View style={leftBlockStyle}>
        <View
          style={avatarStyle}
          accessible
          accessibilityLabel="Tally"
        >
          <TallyIcon size={24} color={theme.colors.onPrimary} />
        </View>
        <View style={textBlockStyle}>
          <Text variant="headlineMd" color="primary">
            {`Hola, ${userName}`}
          </Text>
          <Text variant="bodyMd" color="onSurfaceVariant">
            {formattedDate}
          </Text>
        </View>
      </View>

      <View style={rightRowStyle}>
        {onChallengePress !== undefined && (
          <Pressable
            onPress={onChallengePress}
            accessibilityRole="button"
            accessibilityLabel="Modo Reto"
            hitSlop={BELL_HIT_SLOP}
            style={({ pressed }) => [
              iconPressableStyle,
              pressed ? { opacity: 0.5 } : null,
            ]}
          >
            <Swords size={BELL_ICON_SIZE} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
        {onSharePress !== undefined && (
          <Pressable
            onPress={onSharePress}
            disabled={shareDisabled}
            accessibilityRole="button"
            accessibilityLabel="Compartir progreso"
            hitSlop={BELL_HIT_SLOP}
            style={({ pressed }) => [
              iconPressableStyle,
              (pressed || shareDisabled) ? { opacity: 0.5 } : null,
            ]}
          >
            <Share2 size={BELL_ICON_SIZE} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
        <Pressable
          onPress={handleBellPress}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          hitSlop={BELL_HIT_SLOP}
          style={iconPressableStyle}
        >
          <Bell size={BELL_ICON_SIZE} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}
