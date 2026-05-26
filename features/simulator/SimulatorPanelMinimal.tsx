import { View, type ViewStyle } from 'react-native';
import { PressableCard } from '@/components/base/PressableCard';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

/**
 * Panel mínimo de debug del simulador.
 *
 * Cuatro botones (+100, +500, +1.000, +5.000) en grid 2x2 que disparan el
 * callback `onAddSteps`. El componente NO conoce la implementación concreta
 * del `StepSource` — quien lo monta es responsable de cablear la lógica.
 *
 * No es UI de producto: es herramienta de desarrollo. Sin headers
 * decorativos, sin íconos, sin animaciones.
 */

export type SimulatorPanelMinimalProps = {
  onAddSteps: (amount: number) => Promise<void> | void;
};

type StepIncrement = {
  readonly amount: number;
  readonly label: string;
  readonly accessibilityLabel: string;
};

// Notación con punto miles en español (1.000, 5.000)
const formatAmount = (amount: number): string =>
  `+${amount.toLocaleString('es-AR')}`;

const INCREMENTS: readonly StepIncrement[] = [
  { amount: 100, label: formatAmount(100), accessibilityLabel: 'Agregar 100 pasos' },
  { amount: 500, label: formatAmount(500), accessibilityLabel: 'Agregar 500 pasos' },
  { amount: 1000, label: formatAmount(1000), accessibilityLabel: 'Agregar 1000 pasos' },
  { amount: 5000, label: formatAmount(5000), accessibilityLabel: 'Agregar 5000 pasos' },
] as const;

export function SimulatorPanelMinimal({ onAddSteps }: SimulatorPanelMinimalProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.spacing.sm,
    columnGap: theme.spacing.sm,
  };

  // Dos columnas: cada botón ocupa ~la mitad del contenedor menos el gap.
  // Se usa porcentaje para que el wrap coloque 2 por fila sin cálculos manuales.
  const buttonStyle: ViewStyle = {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View style={containerStyle}>
      {INCREMENTS.map((increment) => (
        <PressableCard
          key={increment.amount}
          accessibilityLabel={increment.accessibilityLabel}
          onPress={() => {
            void onAddSteps(increment.amount);
          }}
          style={buttonStyle}
        >
          <Text variant="labelMd">{increment.label}</Text>
        </PressableCard>
      ))}
    </View>
  );
}
