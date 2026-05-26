import { Pressable, View, type ViewStyle } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

const AVATAR_SIZE = 40;
const BELL_ICON_SIZE = 24;
const BELL_TOUCH_TARGET = 44;
const BELL_HIT_SLOP = (BELL_TOUCH_TARGET - BELL_ICON_SIZE) / 2;

export type HomeHeaderProps = {
  userName: string;
  currentDate: Date;
};

/**
 * Formatea la fecha en español rioplatense con la primera letra en mayúscula.
 * iOS suele devolver "jueves, 24 de octubre" (todo minúsculas), así que se
 * capitaliza el primer carácter manualmente.
 */
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

/**
 * Header del Home (DI-010).
 *
 *   [Avatar 40pt]  Hola, {name}        🔔
 *                  Jueves, 24 de Octubre
 *
 * Avatar es decorativo (no clickeable). Bell tiene touch target ≥ 44pt.
 * El `onPress` de Bell es placeholder hasta que se integre el panel de
 * notificaciones en un sprint futuro.
 */
export function HomeHeader({ userName, currentDate }: HomeHeaderProps) {
  const theme = useTheme();

  const initial = userName.trim().charAt(0).toUpperCase() || '?';
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
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textBlockStyle: ViewStyle = {
    flexShrink: 1,
  };

  const bellPressableStyle: ViewStyle = {
    minWidth: BELL_TOUCH_TARGET,
    minHeight: BELL_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  };

  // TODO Sprint N: abrir panel de notificaciones cuando exista la feature.
  const handleBellPress = (): void => {};

  return (
    <View style={containerStyle}>
      <View style={leftBlockStyle}>
        <View
          style={avatarStyle}
          accessible
          accessibilityLabel={`Avatar de ${userName}`}
        >
          <Text variant="labelMd" color="onPrimaryContainer">
            {initial}
          </Text>
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

      <Pressable
        onPress={handleBellPress}
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
        hitSlop={BELL_HIT_SLOP}
        style={bellPressableStyle}
      >
        <Bell size={BELL_ICON_SIZE} color={theme.colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}
