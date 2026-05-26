import { Alert, ScrollView, View, type ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { PressableCard } from '@/components/base/PressableCard';
import { Text, type TextVariant } from '@/components/base/Text';
import { useThemeContext, useTheme } from '@/design-system/useTheme';
import type { ColorSchemePreference } from '@/design-system/ThemeProvider';
import { useStepsToday } from '@/hooks/useStepsToday';
import { getStepSource, type StepSourceInstance } from '@/features/steps/sources';
import { SimulatorPanelMinimal } from '@/features/simulator/SimulatorPanelMinimal';

const TYPOGRAPHY_VARIANTS: TextVariant[] = [
  'displayHero',
  'displayHeroMobile',
  'headlineLg',
  'headlineMd',
  'bodyLg',
  'bodyMd',
  'labelMd',
  'labelSm',
];

const SWATCH_KEYS: (keyof ReturnType<typeof useTheme>['colors'])[] = [
  'primary',
  'primaryContainer',
  'secondary',
  'secondaryContainer',
  'surface',
  'surfaceContainer',
];

const SWATCH_SIZE = 64;

function nextPreference(current: ColorSchemePreference): ColorSchemePreference {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light';
}

export default function DesignTestScreen() {
  const { theme, scheme, preference, setPreference } = useThemeContext();
  const { stepsToday, source, isReady } = useStepsToday();

  const handleAddSteps = async (amount: number) => {
    // Cast intencional: solo válido mientras la factory devuelva SimulatedStepSource.
    // `addSteps` no existe en la interfaz `StepSource`; es del shape concreto del
    // simulador. NO COPIAR ESTE PATRÓN A CÓDIGO DE PRODUCTO. El panel definitivo
    // recibirá `onAddSteps` desde un wrapper que lo cablee — no haciendo el cast
    // inline en la pantalla. Esta pantalla es de validación y se borrará en Sprint 3.
    const instance = getStepSource() as StepSourceInstance;
    await instance.addSteps(amount);
  };

  const screenStyle: ViewStyle = {
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  };

  const sectionStyle: ViewStyle = {
    gap: theme.spacing.md,
  };

  const swatchGridStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  };

  return (
    <ScrollView contentContainerStyle={screenStyle}>
      <View style={sectionStyle}>
        <Text variant="headlineLg">Pantalla de validación</Text>
        <Text variant="bodyMd" color="onSurfaceVariant">
          Tema: {preference} (resuelto: {scheme})
        </Text>
        <PressableCard
          onPress={() => setPreference(nextPreference(preference))}
          accessibilityLabel="Cambiar preferencia de tema"
        >
          <Text variant="labelMd" color="primary">
            Cambiar tema (toca para ciclar)
          </Text>
        </PressableCard>
      </View>

      <View style={sectionStyle}>
        <Text variant="headlineMd">Tipografía</Text>
        {TYPOGRAPHY_VARIANTS.map((variant) => (
          <Text key={variant} variant={variant}>
            {variant}
          </Text>
        ))}
      </View>

      <View style={sectionStyle}>
        <Text variant="headlineMd">Cards</Text>
        <Card>
          <Text variant="bodyMd">Card default</Text>
        </Card>
        <Card variant="elevated">
          <Text variant="bodyMd">Card elevated</Text>
        </Card>
        <PressableCard
          onPress={() => Alert.alert('Presionado')}
          accessibilityLabel="Card de prueba"
        >
          <Text variant="bodyMd">PressableCard (toca para alerta)</Text>
        </PressableCard>
      </View>

      <View style={sectionStyle}>
        <Text variant="headlineMd">Paleta</Text>
        <View style={swatchGridStyle}>
          {SWATCH_KEYS.map((key) => (
            <View key={key} style={{ gap: theme.spacing.xs, alignItems: 'center' }}>
              <View
                style={{
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors[key],
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              />
              <Text variant="labelSm">{key}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={sectionStyle}>
        <Text variant="headlineMd">Sprint 2 — Step Source</Text>
        <Text variant="displayHeroMobile" color="counterPrimary">
          {isReady ? stepsToday.toLocaleString('es-AR') : '…'}
        </Text>
        <Text variant="labelSm" color="onSurfaceVariant">
          Fuente: {source} · {isReady ? 'listo' : 'cargando'}
        </Text>
        <SimulatorPanelMinimal onAddSteps={handleAddSteps} />
      </View>
    </ScrollView>
  );
}
