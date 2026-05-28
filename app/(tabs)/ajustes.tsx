import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Text } from '@/components/base/Text';
import { useTheme, useThemeContext } from '@/design-system/useTheme';
import {
  getStepSource,
  SimulatedStepSource,
  type StepSourceInstance,
} from '@/features/steps/sources';
import { SettingsRow } from '@/components/features/settings/SettingsRow';
import { SettingsSection } from '@/components/features/settings/SettingsSection';
import { SimulatorButton } from '@/components/features/settings/SimulatorButton';
import { formatLocalDate } from '@/lib/dates';
import { upsertDailySteps, upsertMission, updateStreakState } from '@/lib/db';
import { useMissionStore } from '@/stores/missionStore';

// ─── Persistencia ────────────────────────────────────────────────────────────

const STORAGE_THEME_KEY = 'tally:theme';
const STORAGE_NOTIF_KEY = 'tally:notifications';

// ─── Demo seed (solo desarrollo) ─────────────────────────────────────────────

// TODO: eliminar en Sprint 7 (producción)
const DEMO_DAYS = [
  { daysBack: 7, steps: 3200 },
  { daysBack: 6, steps: 7800 },
  { daysBack: 5, steps: 5100 },
  { daysBack: 4, steps: 9400 },
  { daysBack: 3, steps: 2600 },
  { daysBack: 2, steps: 8200 },
  { daysBack: 1, steps: 6700 },
] as const;

// TODO: eliminar en Sprint 7 (producción)
async function seedDemoData(): Promise<void> {
  try {
    const today = new Date();

    for (const { daysBack, steps } of DEMO_DAYS) {
      const d = new Date(today);
      d.setDate(today.getDate() - daysBack);
      const date = formatLocalDate(d);

      await upsertDailySteps(date, steps, 'simulated');

      const completed = steps >= 5000;
      let completedAt: string | null = null;
      if (completed) {
        const t = new Date(d);
        t.setHours(23, 0, 0, 0);
        completedAt = t.toISOString();
      }

      await upsertMission({
        date,
        templateId: 'total-5k',
        title: 'Llegar a 5 000 pasos',
        description: 'Camina lo suficiente para completar 5 000 pasos antes de medianoche.',
        params: { type: 'TOTAL_STEPS' as const, target: 5000 },
        completed,
        completedAt,
        usedWildcard: false,
      });
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);

    const monday = new Date(today);
    const dow = today.getDay();
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const mondayStr = formatLocalDate(monday);

    await updateStreakState({
      current: 2,
      longest: 2,
      wildcardsAvailable: 1,
      lastWildcardRegen: mondayStr,
      lastEvaluatedDate: yesterdayStr,
    });

    // Re-bootstrap el store para que lea el streak actualizado de la DB.
    // Sin esto, el store mantiene isBootstrapped=true con streakState.current=0
    // del arranque original y la Home sigue mostrando "Sin racha".
    await useMissionStore.getState().refresh();

    Alert.alert('Demo cargada', '7 días de historial insertados.');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    Alert.alert('Error', msg);
  }
}

// ─── Mapeo SegmentedControl ↔ ColorSchemePreference ──────────────────────────

// Reuse PeriodOption shape is wrong — define dedicated option type.
type ThemeOption = 'system' | 'light' | 'dark';

const THEME_SEGMENT_OPTIONS: readonly ThemeOption[] = ['system', 'light', 'dark'] as const;

// SegmentedControl was built for PeriodOption; for theme we need an adapter.
const THEME_OPTION_LABELS: Record<ThemeOption, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

// ─── ThemeSegmentedControl (adapta el componente genérico a ThemeOption) ────

type ThemeSegProps = {
  value: ThemeOption;
  onChange: (v: ThemeOption) => void;
};

function ThemeSegmentedControl({ value, onChange }: ThemeSegProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.full,
    padding: 3,
  };

  return (
    <View style={containerStyle} accessibilityRole="radiogroup">
      {THEME_SEGMENT_OPTIONS.map((option) => {
        const isActive = option === value;

        const segStyle: ViewStyle = {
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
              segStyle,
              !isActive && pressed ? { opacity: 0.6 } : null,
            ]}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={THEME_OPTION_LABELS[option]}
          >
            <Text
              variant="labelMd"
              color={isActive ? 'onPrimary' : 'onSurfaceVariant'}
            >
              {THEME_OPTION_LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AjustesScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemeContext();
  const insets = useSafeAreaInsets();

  // Fuente activa (singleton de la factory). Su `kind` decide si los controles
  // del simulador tienen sentido en este entorno.
  // Llamada directa al singleton — no useMemo para evitar cachés de módulo
  // que en Expo Go pueden capturar el valor antes de que __DEV__ resuelva.
  const isSimulated = getStepSource().kind === 'simulated';

  // Fuente concreta para los botones de debug.
  const simulatorSource = useMemo<StepSourceInstance>(() => {
    const source = getStepSource();
    if (typeof (source as Partial<StepSourceInstance>).addSteps === 'function') {
      return source as StepSourceInstance;
    }
    return new SimulatedStepSource();
  }, []);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

  // Hydrate persisted values on mount
  useEffect(() => {
    async function hydrate(): Promise<void> {
      try {
        const [savedTheme, savedNotif] = await Promise.all([
          AsyncStorage.getItem(STORAGE_THEME_KEY),
          AsyncStorage.getItem(STORAGE_NOTIF_KEY),
        ]);
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setPreference(savedTheme);
        }
        if (savedNotif === 'true') {
          setNotifEnabled(true);
        }
      } catch {
        // Ignore storage errors on load
      } finally {
        setNotifLoaded(true);
      }
    }
    void hydrate();
  }, [setPreference]);

  async function handleThemeChange(option: ThemeOption): Promise<void> {
    setPreference(option);
    try {
      await AsyncStorage.setItem(STORAGE_THEME_KEY, option);
    } catch {
      // Non-critical: preference already applied in memory
    }
  }

  async function handleNotifToggle(value: boolean): Promise<void> {
    if (!value) {
      setNotifEnabled(false);
      await AsyncStorage.setItem(STORAGE_NOTIF_KEY, 'false').catch(() => null);
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setNotifEnabled(granted);
    await AsyncStorage.setItem(STORAGE_NOTIF_KEY, String(granted)).catch(() => null);
  }

  function addSteps(amount: number): void {
    void simulatorSource.addSteps(amount);
  }

  const appVersion = Constants.expoConfig?.version ?? '—';

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
        <Text variant="headlineLg">Ajustes</Text>
      </View>

      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Apariencia ── */}
        <SettingsSection title="Apariencia">
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.sm + 2,
              paddingBottom: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            <Text variant="bodyMd" color="onSurface">
              Tema
            </Text>
            <ThemeSegmentedControl
              value={preference as ThemeOption}
              onChange={option => { void handleThemeChange(option); }}
            />
          </View>
        </SettingsSection>

        {/* ── Notificaciones ── */}
        <SettingsSection title="Notificaciones">
          <SettingsRow
            label="Recordatorio diario"
            isLast
            control={
              <Switch
                value={notifLoaded ? notifEnabled : false}
                onValueChange={v => { void handleNotifToggle(v); }}
                trackColor={{
                  false: theme.colors.outlineVariant,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.onPrimary}
                accessibilityLabel="Activar recordatorio diario"
              />
            }
          />
        </SettingsSection>

        {/* ── Simulador ── */}
        <SettingsSection title="Simulador">
          <SettingsRow
            label="Fuente de datos"
            value={isSimulated ? 'Simulado' : 'Pedómetro'}
            isLast
          />
        </SettingsSection>

        {/* Los botones de simulación solo tienen sentido con la fuente simulada
            (Expo Go / desarrollo). Con el Pedómetro real no hay nada que inyectar,
            así que se ocultan. */}
        {isSimulated && (
          <View style={{ gap: theme.spacing.sm }}>
            <SimulatorButton
              label="Simular caminata corta (+500 pasos)"
              onPress={() => addSteps(500)}
            />
            <SimulatorButton
              label="Simular caminata larga (+2000 pasos)"
              onPress={() => addSteps(2000)}
            />
            <SimulatorButton
              label="Simular día completo (+8000 pasos)"
              onPress={() => addSteps(8000)}
            />
          </View>
        )}

        {/* ── Acerca de ── */}
        <SettingsSection title="Acerca de">
          <SettingsRow label="Versión" value={appVersion} />
          <SettingsRow
            label="Fuente de pasos"
            value={isSimulated ? 'Simulador (desarrollo)' : 'Pedómetro (dispositivo)'}
            isLast
          />
        </SettingsSection>

        {/* TODO: eliminar en Sprint 7 (producción) */}
        <SimulatorButton
          label="Cargar datos demo"
          onPress={() => { void seedDemoData(); }}
        />

      </ScrollView>
    </View>
  );
}
