import { useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Svg, Line, Text as SvgText } from 'react-native-svg';
import { ThemeProvider } from '@/design-system/ThemeProvider';

const SPLASH_BG = '#151515';
const SPLASH_ACCENT = '#C5F04A';
const SPLASH_DURATION_MS = 1500;

function SplashView() {
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View style={containerStyle}>
      <Svg width={200} height={56} viewBox="0 0 200 56">
        <Line x1="8"  y1="10" x2="8"  y2="46" stroke={SPLASH_ACCENT} strokeWidth={5} strokeLinecap="round"/>
        <Line x1="20" y1="10" x2="20" y2="46" stroke={SPLASH_ACCENT} strokeWidth={5} strokeLinecap="round"/>
        <Line x1="32" y1="10" x2="32" y2="46" stroke={SPLASH_ACCENT} strokeWidth={5} strokeLinecap="round"/>
        <Line x1="44" y1="10" x2="44" y2="46" stroke={SPLASH_ACCENT} strokeWidth={5} strokeLinecap="round"/>
        <Line x1="2"  y1="44" x2="50" y2="12" stroke={SPLASH_ACCENT} strokeWidth={5} strokeLinecap="round"/>
        <SvgText
          x="68"
          y="40"
          fontFamily="Inter_700Bold"
          fontSize={36}
          fontWeight="700"
          letterSpacing={-1}
          fill={SPLASH_ACCENT}
        >
          tally
        </SvgText>
      </Svg>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded || !splashDone) {
    return <SplashView />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="challenge" options={{ presentation: 'modal' }} />
          <Stack.Screen name="mission-details" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
