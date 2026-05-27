import { useState } from 'react';
import { View } from 'react-native';
import { G, Rect, Svg, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/design-system/useTheme';
import type { BarDatum } from './types';

type Props = {
  data: BarDatum[];
};

const CHART_HEIGHT = 160;
const LABEL_AREA_H = 22;
const BAR_GAP = 2;
const MIN_BAR_H = 3;
const TODAY_STROKE = '#C5F04A';
const TODAY_STROKE_W = 1.5;

export function BarChart({ data }: Props) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const numBars = data.length;

  if (numBars === 0 || containerWidth === 0) {
    return (
      <View
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%', height: CHART_HEIGHT + LABEL_AREA_H }}
      />
    );
  }

  const maxSteps = data.reduce((m, d) => Math.max(m, d.steps), 0);
  const maxVal = Math.max(maxSteps, 1);
  const barWidth = Math.max(
    1,
    (containerWidth - (numBars - 1) * BAR_GAP) / numBars,
  );

  function bH(steps: number): number {
    if (steps === 0) return MIN_BAR_H;
    return Math.max(MIN_BAR_H, (steps / maxVal) * CHART_HEIGHT);
  }
  function bX(i: number): number {
    return i * (barWidth + BAR_GAP);
  }
  function bY(steps: number): number {
    return CHART_HEIGHT - bH(steps);
  }

  function showLabel(i: number, label: string): boolean {
    if (label === '') return false;
    if (numBars <= 7) return true;
    if (numBars <= 31) return i === 0 || i % 5 === 0 || i === numBars - 1;
    return true; // year view: only bars with non-empty labels are shown
  }

  const svgHeight = CHART_HEIGHT + LABEL_AREA_H;

  return (
    <View onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
      <Svg width={containerWidth} height={svgHeight}>
        {data.map((bar, i) => {
          const h = bH(bar.steps);
          const x = bX(i);
          const y = bY(bar.steps);
          const cx = x + barWidth / 2;
          const rx = Math.min(3, barWidth / 3);

          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={rx}
                fill={bar.barColor}
                stroke={bar.isToday ? TODAY_STROKE : 'none'}
                strokeWidth={bar.isToday ? TODAY_STROKE_W : 0}
              />
              {showLabel(i, bar.label) && (
                <SvgText
                  x={cx}
                  y={CHART_HEIGHT + LABEL_AREA_H - 2}
                  textAnchor="middle"
                  fontSize={9}
                  fill={theme.colors.onSurfaceVariant}
                  fontFamily="Inter_400Regular"
                >
                  {bar.label}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
