import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableCard } from '@/components/base/PressableCard';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text variant="displayHeroMobile" color="counterPrimary">
        StepApp
      </Text>

      {/* TEMPORAL: utilidad de dev para saltar a la pantalla de validación.
          Se borra en Sprint 3 cuando construyamos la Home real.
          Nota: no usamos <Link asChild> porque PressableCard no es forwardRef;
          el patrón Slot de expo-router descarta children sin ref forwarding. */}
      <PressableCard
        onPress={() => router.push('/design-test')}
        accessibilityLabel="Ir a la pantalla de design test"
        style={{ marginTop: theme.spacing.xl }}
      >
        <Text variant="labelMd">Ir a Design Test →</Text>
      </PressableCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
