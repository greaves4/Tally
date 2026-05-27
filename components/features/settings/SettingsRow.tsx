import { View, type ViewStyle } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

type Props = {
  label: string;
  value?: string;
  control?: React.ReactNode;
  isLast?: boolean;
};

/**
 * Fila estándar de ajuste: label izquierda + control/valor derecha.
 * `isLast` omite el separador inferior.
 */
export function SettingsRow({ label, value, control, isLast = false }: Props) {
  const theme = useTheme();

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  };

  const separatorStyle: ViewStyle = {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: theme.spacing.md,
  };

  return (
    <>
      <View style={rowStyle}>
        <Text variant="bodyMd" color="onSurface">
          {label}
        </Text>
        {value !== undefined && (
          <Text variant="bodyMd" color="onSurfaceVariant">
            {value}
          </Text>
        )}
        {control !== undefined && control}
      </View>
      {!isLast && <View style={separatorStyle} />}
    </>
  );
}
