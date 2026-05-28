import { View, type ViewStyle } from 'react-native';
import { Heart, Smartphone, Tag } from 'lucide-react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

/**
 * Fuentes de pasos posibles. Refleja las implementaciones de `StepSource`
 * que se documentan en CLAUDE.md (SimulatedStepSource / PedometerStepSource).
 *
 * Se define como literal local en lugar de re-exportar el tipo del hook
 * `useStepSource` porque este componente es puramente visual y no debe
 * acoplarse a la capa de datos. Si el set crece en el futuro, mobile-dev
 * decide si centralizar la unión en `types/`.
 */
export type DataSourceKind = 'simulated' | 'pedometer' | 'healthkit';

export type DataSourceIndicatorProps = {
  source: DataSourceKind;
};

const ICON_SIZE = 14;

/**
 * Chip pill que indica la fuente activa del contador de pasos (DI-009).
 *
 * - `simulated`: terracota suave (secondaryContainer) — siempre visible en dev.
 * - `pedometer`: verde musgo suave (primaryContainer) — solo en debug builds.
 *
 * La visibilidad condicional (DI-012) la decide quien consume este componente.
 */
export function DataSourceIndicator({ source }: DataSourceIndicatorProps) {
  const theme = useTheme();

  const backgroundColor =
    source === 'simulated'
      ? theme.colors.secondaryContainer
      : theme.colors.primaryContainer;

  const foregroundColor =
    source === 'simulated'
      ? theme.colors.onSecondaryContainer
      : theme.colors.onPrimaryContainer;

  const label =
    source === 'healthkit' ? 'Apple Health' :
    source === 'pedometer' ? 'Pedómetro' :
    'Simulador';

  const Icon =
    source === 'healthkit' ? Heart :
    source === 'pedometer' ? Smartphone :
    Tag;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor,
  };

  return (
    <View
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={`Fuente de datos: ${label}`}
    >
      <Icon size={ICON_SIZE} color={foregroundColor} />
      <Text variant="labelSm" style={{ color: foregroundColor }}>
        {label}
      </Text>
    </View>
  );
}
