import { View, type ViewStyle } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

type Props = {
  title?: string;
  children: React.ReactNode;
};

/**
 * Agrupa filas de ajuste en una Card con título de sección opcional.
 */
export function SettingsSection({ title, children }: Props) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    gap: theme.spacing.sm,
  };

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  };

  const titleStyle: ViewStyle = {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  };

  return (
    <View style={containerStyle}>
      {title !== undefined && (
        <View style={titleStyle}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {title.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={cardStyle}>{children}</View>
    </View>
  );
}
