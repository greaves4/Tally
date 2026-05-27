import { View, type ViewStyle } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import type { DayData } from './types';

type Props = {
  days: DayData[];
};

function parseDateStr(s: string): Date {
  const [yStr = '0', mStr = '0', dStr = '0'] = s.split('-');
  return new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
}

function formatDayLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  // "lun., 26 de may." → "Lun 26 may"
  const raw = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return raw
    .replace(/\./g, '')
    .replace(' de ', ' ')
    .replace(/^(.)/, c => c.toUpperCase());
}

type StatusInfo = {
  symbol: string;
  color: 'primary' | 'tertiary' | 'onSurfaceVariant';
};

function getStatusInfo(day: DayData): StatusInfo {
  if (day.missionCompleted === true) return { symbol: '✓', color: 'primary' };
  if (day.missionCompleted === false && day.steps > 0)
    return { symbol: '✗', color: 'tertiary' };
  return { symbol: '—', color: 'onSurfaceVariant' };
}

function DayRow({ day }: { day: DayData }) {
  const theme = useTheme();

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
  };

  const labelStyle: ViewStyle = { flex: 1 };
  const stepsStyle: ViewStyle = { minWidth: 72, alignItems: 'flex-end' };
  const statusStyle: ViewStyle = { minWidth: 24, alignItems: 'flex-end' };

  const { symbol, color } = getStatusInfo(day);
  const stepsText =
    day.steps > 0 ? day.steps.toLocaleString('es-AR') : '—';

  return (
    <View style={rowStyle}>
      <View style={labelStyle}>
        <Text variant="bodyMd" color="onSurface">
          {formatDayLabel(day.date)}
        </Text>
      </View>
      <View style={stepsStyle}>
        <Text variant="labelMd" color="onSurfaceVariant">
          {stepsText}
        </Text>
      </View>
      <View style={statusStyle}>
        <Text variant="labelMd" color={color}>
          {symbol}
        </Text>
      </View>
    </View>
  );
}

export function DayList({ days }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {days.map(day => (
        <DayRow key={day.date} day={day} />
      ))}
    </View>
  );
}
