import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eachDayOfInterval, subDays } from 'date-fns';
import { Line, Svg } from 'react-native-svg';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import { formatLocalDate } from '@/lib/dates';
import { getMissionForDate, getStepsRange } from '@/lib/db';
import { BarChart } from '@/components/features/progress/BarChart';
import { DayList } from '@/components/features/progress/DayList';
import { SegmentedControl } from '@/components/features/progress/SegmentedControl';
import type {
  BarDatum,
  DayData,
  PeriodOption,
} from '@/components/features/progress/types';

// ─── Colores de barra ────────────────────────────────────────────────────────

const BAR_COMPLETED = '#C5F04A';
const BAR_EMPTY = '#333333';
const BAR_MISSED = '#983A31';

// ─── Helpers de fecha ────────────────────────────────────────────────────────

function parseDateStr(s: string): Date {
  const [yStr = '0', mStr = '0', dStr = '0'] = s.split('-');
  return new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
}

function weekBarLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d
    .toLocaleDateString('es-AR', { weekday: 'short' })
    .replace(/\./g, '')
    .slice(0, 3)
    .replace(/^(.)/, c => c.toUpperCase());
}

function monthBarLabel(dateStr: string): string {
  return String(parseDateStr(dateStr).getDate());
}

function yearBarLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  if (d.getDate() > 7) return '';
  return d
    .toLocaleDateString('es-AR', { month: 'short' })
    .replace(/\./g, '')
    .slice(0, 3)
    .replace(/^(.)/, c => c.toUpperCase());
}

// ─── DayData → BarDatum ──────────────────────────────────────────────────────

function getBarColor(
  steps: number,
  missionCompleted: boolean | null,
  yearView: boolean,
): string {
  if (steps === 0) return BAR_EMPTY;
  if (yearView) return BAR_COMPLETED;
  return missionCompleted === true ? BAR_COMPLETED : BAR_MISSED;
}

function toBarData(
  days: DayData[],
  period: PeriodOption,
  todayStr: string,
): BarDatum[] {
  if (period === 'year') {
    const bars: BarDatum[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const first = chunk[0];
      if (first === undefined) continue;
      const totalSteps = chunk.reduce((sum, d) => sum + d.steps, 0);
      bars.push({
        label: yearBarLabel(first.date),
        steps: totalSteps,
        barColor: totalSteps === 0 ? BAR_EMPTY : BAR_COMPLETED,
        isToday: chunk.some(d => d.date === todayStr),
      });
    }
    return bars;
  }

  return days.map(d => ({
    label: period === 'week' ? weekBarLabel(d.date) : monthBarLabel(d.date),
    steps: d.steps,
    barColor: getBarColor(d.steps, d.missionCompleted, false),
    isToday: d.date === todayStr,
  }));
}

// ─── Hook de carga ───────────────────────────────────────────────────────────

function useProgressData(period: PeriodOption): {
  isLoading: boolean;
  dayData: DayData[];
} {
  const [isLoading, setIsLoading] = useState(true);
  const [dayData, setDayData] = useState<DayData[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        const today = new Date();
        const todayStr = formatLocalDate(today);
        const daysBack = period === 'week' ? 6 : period === 'month' ? 29 : 363;
        const from = subDays(today, daysBack);
        const fromStr = formatLocalDate(from);

        const allDays = eachDayOfInterval({ start: from, end: today });
        const dateStrings = allDays.map(d => formatLocalDate(d));

        const stepsRecords = await getStepsRange(fromStr, todayStr);
        const stepsMap = new Map<string, number>();
        for (const r of stepsRecords) {
          stepsMap.set(r.date, r.steps);
        }

        const missionsMap = new Map<string, boolean | null>();

        if (period !== 'year') {
          const missions = await Promise.all(
            dateStrings.map(d => getMissionForDate(d)),
          );
          dateStrings.forEach((dateStr, i) => {
            // missions[i]: MissionStatus | null | undefined (noUncheckedIndexedAccess)
            missionsMap.set(dateStr, missions[i]?.completed ?? null);
          });
        }

        if (cancelled) return;

        const result: DayData[] = dateStrings.map(dateStr => ({
          date: dateStr,
          steps: stepsMap.get(dateStr) ?? 0,
          missionCompleted: missionsMap.get(dateStr) ?? null,
        }));

        setDayData(result);
      } catch (e) {
        console.warn('[Progreso] load failed:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return { isLoading, dayData };
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xxxl,
  };

  return (
    <View style={containerStyle}>
      <Svg width={56} height={56} viewBox="0 0 56 56">
        <Line
          x1="8" y1="10" x2="8" y2="46"
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Line
          x1="20" y1="10" x2="20" y2="46"
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Line
          x1="32" y1="10" x2="32" y2="46"
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Line
          x1="44" y1="10" x2="44" y2="46"
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Line
          x1="2" y1="44" x2="50" y2="12"
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </Svg>
      <Text variant="bodyMd" color="onSurfaceVariant">
        Aún no hay historial
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProgresoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<PeriodOption>('week');
  const { isLoading, dayData } = useProgressData(period);

  const todayStr = formatLocalDate(new Date());
  const hasAnyData = dayData.some(d => d.steps > 0);
  const barData: BarDatum[] = toBarData(dayData, period, todayStr);
  const listDays = [...dayData].reverse();

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
  };

  const headerStyle: ViewStyle = {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  };

  const contentStyle: ViewStyle = {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  return (
    <View style={screenStyle}>
      <View style={headerStyle}>
        <Text variant="headlineLg">Progreso</Text>
      </View>

      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl value={period} onChange={setPeriod} />

        {isLoading ? (
          <View
            style={{
              paddingVertical: theme.spacing.xxxl,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : hasAnyData ? (
          <>
            <BarChart data={barData} />
            {period !== 'year' && <DayList days={listDays} />}
          </>
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </View>
  );
}
