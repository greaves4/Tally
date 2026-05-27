export type PeriodOption = 'week' | 'month' | 'year';

export type DayData = {
  date: string;                    // YYYY-MM-DD local
  steps: number;
  missionCompleted: boolean | null; // null = no mission record for this day
};

export type BarDatum = {
  label: string;
  steps: number;
  barColor: string;
  isToday: boolean;
};
