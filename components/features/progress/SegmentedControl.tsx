import { Pressable, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import type { PeriodOption } from './types';

const LABELS: Record<PeriodOption, string> = {
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

const OPTIONS: readonly PeriodOption[] = ['week', 'month', 'year'];

type Props = {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
};

export function SegmentedControl({ value, onChange }: Props) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.full,
    padding: 3,
  };

  return (
    <View style={containerStyle} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const isActive = option === value;

        const segmentStyle: ViewStyle = {
          flex: 1,
          paddingVertical: theme.spacing.sm,
          alignItems: 'center',
          borderRadius: theme.radius.full,
          backgroundColor: isActive ? theme.colors.primary : 'transparent',
        };

        return (
          <Pressable
            key={option}
            style={({ pressed }) => [
              segmentStyle,
              !isActive && pressed ? { opacity: 0.6 } : null,
            ]}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={LABELS[option]}
          >
            <Text
              variant="labelMd"
              color={isActive ? 'onPrimary' : 'onSurfaceVariant'}
            >
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
