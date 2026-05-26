import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

export default function ProgresoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: theme.spacing.lg,
  };

  const contentStyle: ViewStyle = {
    flex: 1,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  };

  return (
    <View style={screenStyle}>
      <View style={contentStyle}>
        <Text variant="headlineLg">Progreso</Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          Próximamente — Sprint 5
        </Text>
      </View>
    </View>
  );
}
