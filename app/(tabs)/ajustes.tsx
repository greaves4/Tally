import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import { getStepSource, type StepSourceInstance } from '@/features/steps/sources';

export default function AjustesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: insets.top,
  };

  const contentStyle: ViewStyle = {
    paddingTop: theme.spacing.lg,
    paddingBottom: insets.bottom + theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  };

  const debugButtonStyle: ViewStyle = {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.semantic.destructive,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  };

  return (
    <View style={screenStyle}>
      <ScrollView contentContainerStyle={contentStyle}>
        <Text variant="headlineLg">Ajustes</Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          Próximamente — Sprint 6
        </Text>

        {/* TODO Sprint 6: eliminar este botón */}
        <Pressable
          style={({ pressed }) => [debugButtonStyle, pressed && { opacity: 0.7 }]}
          onPress={() => {
            void (getStepSource() as StepSourceInstance).addSteps(1000);
          }}
          accessibilityRole="button"
          accessibilityLabel="Agregar 1000 pasos de debug"
        >
          <Text variant="labelMd" color="onDestructive">
            DEBUG: +1000 pasos
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
