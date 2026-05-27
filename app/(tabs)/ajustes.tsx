import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Text } from '@/components/base/Text';
import { useTheme, useThemeContext } from '@/design-system/useTheme';
import { getStepSource, type StepSourceInstance } from '@/features/steps/sources';
import { SettingsRow } from '@/components/features/settings/SettingsRow';
import { SettingsSection } from '@/components/features/settings/SettingsSection';
import { SimulatorButton } from '@/components/features/settings/SimulatorButton';

// ─── Persistencia ────────────────────────────────────────────────────────────

const STORAGE_THEME_KEY = 'tally:theme';
const STORAGE_NOTIF_KEY = 'tally:notifications';

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
    void (getStepSource() as StepSourceInstance).addSteps(amount);
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

  const debugButtonStyle: ViewStyle = {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.semantic.destructive,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
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
          <SettingsRow label="Fuente de datos" value="Simulado" isLast />
        </SettingsSection>

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

        {/* ── Acerca de ── */}
        <SettingsSection title="Acerca de">
          <SettingsRow label="Versión" value={appVersion} />
          <SettingsRow label="Fuente de pasos" value="Simulador (desarrollo)" isLast />
        </SettingsSection>

        {/* TODO: eliminar en Sprint 7 */}
        <Pressable
          style={({ pressed }) => [debugButtonStyle, pressed && { opacity: 0.7 }]}
          onPress={() => addSteps(1000)}
          accessibilityRole="button"
          accessibilityLabel="Agregar 1000 pasos de debug"
        >
          <Text variant="labelMd" color="onDestructive">
            DEBUG: +1000 pasos
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
