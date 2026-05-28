import { View, type ViewStyle } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { Text } from '@/components/base/Text';
import { useTheme, useThemeContext } from '@/design-system/useTheme';
import type { BalanceKind } from '@/lib/stepDebt';

export type BalanceStripProps = {
  kind: BalanceKind;
  balance: number;
  effectiveGoalToday: number;
};

// Colores ámbar para el estado de deuda (fuera del design system por ahora).
// dark: fondo oscuro cálido / light: amarillo pastel. Texto igual en ambos modos.
const DEBT_BG_DARK = '#3D2800';
const DEBT_BG_LIGHT = '#FEF3C7';
const DEBT_TEXT = '#D97706';

const ICON_SIZE = 14;

export function BalanceStrip({ kind, balance, effectiveGoalToday }: BalanceStripProps) {
  const theme = useTheme();
  const { scheme } = useThemeContext();

  let backgroundColor: string;
  let textColor: string;
  let displayText: string;

  if (kind === 'credit') {
    backgroundColor = theme.colors.primaryContainer;
    textColor = theme.colors.onPrimaryContainer;
    displayText = `Crédito: +${balance.toLocaleString('es-AR')} pasos · Mañana puedes relajarte`;
  } else if (kind === 'debt') {
    backgroundColor = scheme === 'dark' ? DEBT_BG_DARK : DEBT_BG_LIGHT;
    textColor = DEBT_TEXT;
    const debtAbs = Math.abs(balance).toLocaleString('es-AR');
    const goalFormatted = effectiveGoalToday.toLocaleString('es-AR');
    displayText = `Debes ${debtAbs} pasos · Meta efectiva mañana: ${goalFormatted}`;
  } else {
    backgroundColor = theme.colors.surface;
    textColor = theme.colors.onSurfaceVariant;
    displayText = 'Al día ✓';
  }

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    backgroundColor,
  };

  return (
    <View style={containerStyle} accessibilityRole="text" accessibilityLabel={displayText}>
      {kind === 'credit' && (
        <TrendingUp size={ICON_SIZE} color={textColor} />
      )}
      <Text variant="labelSm" style={{ color: textColor }}>
        {displayText}
      </Text>
    </View>
  );
}
