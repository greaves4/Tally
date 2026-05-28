import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { Svg, Line } from 'react-native-svg';

const CARD_SIZE = 400;
const PRIMARY_LIMA = '#C5F04A';
const CARD_BG = '#151515';
const WHITE = '#FFFFFF';
const MUTED = '#8A8A8A';
const DARK_LIME = '#3D6B1E';

export type ShareCardProps = {
  stepsToday: number;
  missionTitle: string;
  isCompleted: boolean;
  progress: number;
  streakCount: number;
  date: Date;
};

function TallyIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Line x1="8"  y1="10" x2="8"  y2="46" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Line x1="20" y1="10" x2="20" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Line x1="32" y1="10" x2="32" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Line x1="44" y1="10" x2="44" y2="46" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Line x1="2"  y1="44" x2="50" y2="12" stroke={color} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

function formatSpanishDate(date: Date): string {
  const raw = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const first = raw.charAt(0).toUpperCase();
  return `${first}${raw.slice(1)}`;
}

export function ShareCard({
  stepsToday,
  missionTitle,
  isCompleted,
  progress,
  streakCount,
  date,
}: ShareCardProps) {
  const cardStyle: ViewStyle = {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: CARD_BG,
    padding: 32,
    justifyContent: 'space-between',
  };

  const logoRowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  };

  const logoTextStyle: TextStyle = {
    fontSize: 20,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: 1,
  };

  const stepsBlockStyle: ViewStyle = {
    alignItems: 'center',
    gap: 2,
  };

  const stepsNumberStyle: TextStyle = {
    fontSize: 80,
    fontWeight: '800',
    color: PRIMARY_LIMA,
    lineHeight: 88,
    letterSpacing: -2,
  };

  const stepsLabelStyle: TextStyle = {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 3,
  };

  const missionBlockStyle: ViewStyle = {
    gap: 6,
  };

  const missionTitleStyle: TextStyle = {
    fontSize: 15,
    fontWeight: '600',
    color: WHITE,
    numberOfLines: 2,
  } as TextStyle;

  const statusStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: isCompleted ? PRIMARY_LIMA : MUTED,
  };

  const dateStyle: TextStyle = {
    fontSize: 12,
    color: MUTED,
  };

  const badgeStyle: ViewStyle = {
    alignSelf: 'flex-start',
    backgroundColor: DARK_LIME,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  };

  const badgeTextStyle: TextStyle = {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_LIMA,
    letterSpacing: 0.5,
  };

  const statusText = isCompleted
    ? '✓ Misión cumplida'
    : `En progreso ${Math.round(progress * 100)}%`;

  return (
    <View style={cardStyle}>
      {/* Logo */}
      <View style={logoRowStyle}>
        <TallyIcon size={22} color={PRIMARY_LIMA} />
        <Text style={logoTextStyle}>Tally</Text>
      </View>

      {/* Pasos */}
      <View style={stepsBlockStyle}>
        <Text style={stepsNumberStyle}>
          {stepsToday.toLocaleString('es-AR')}
        </Text>
        <Text style={stepsLabelStyle}>PASOS HOY</Text>
      </View>

      {/* Misión */}
      <View style={missionBlockStyle}>
        <Text style={missionTitleStyle} numberOfLines={2}>
          {missionTitle}
        </Text>
        <Text style={statusStyle}>{statusText}</Text>
        {streakCount > 0 && (
          <View style={badgeStyle}>
            <Text style={badgeTextStyle}>{`🔥 ${streakCount} días seguidos`}</Text>
          </View>
        )}
      </View>

      {/* Fecha */}
      <Text style={dateStyle}>{formatSpanishDate(date)}</Text>
    </View>
  );
}
