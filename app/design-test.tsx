import { Alert, ScrollView, View, type ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { PressableCard } from '@/components/base/PressableCard';
import { Text, type TextVariant } from '@/components/base/Text';
import { useThemeContext, useTheme } from '@/design-system/useTheme';
import type { ColorSchemePreference } from '@/design-system/ThemeProvider';

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
    </ScrollView>
  );
}
