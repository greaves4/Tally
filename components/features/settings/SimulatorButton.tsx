import { Pressable, type ViewStyle } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

type Props = {
  label: string;
  onPress: () => void;
};

/**
 * Botón outline (borde lima, fondo transparente) para acciones del simulador.
 */
export function SimulatorButton({ label, onPress }: Props) {
  const theme = useTheme();

  const baseStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  };

  return (
    <Pressable
      style={({ pressed }) => [baseStyle, pressed && { opacity: 0.6 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text variant="labelMd" color="primary">
        {label}
      </Text>
    </Pressable>
  );
}
