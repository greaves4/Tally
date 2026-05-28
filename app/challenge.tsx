import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text as RNText,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { X } from 'lucide-react-native';
import { Card } from '@/components/base/Card';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';
import { useMissionStore } from '@/stores/missionStore';
import { generateCode, decodeCode, type DecodedChallenge } from '@/lib/challengeCode';

type Tab = 'create' | 'join';

// ─── TabBar ──────────────────────────────────────────────────────────────────

type TabBarProps = { active: Tab; onChange: (t: Tab) => void };

function TabBar({ active, onChange }: TabBarProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radius.full,
    padding: 3,
    marginHorizontal: theme.spacing.lg,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'create', label: 'Crear reto' },
    { key: 'join', label: 'Unirse a reto' },
  ];

  return (
    <View style={containerStyle} accessibilityRole="radiogroup">
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        const segStyle: ViewStyle = {
          flex: 1,
          paddingVertical: theme.spacing.sm,
          alignItems: 'center',
          borderRadius: theme.radius.full,
          backgroundColor: isActive ? theme.colors.primary : 'transparent',
        };
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [segStyle, !isActive && pressed ? { opacity: 0.6 } : null]}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={label}
          >
            <Text variant="labelMd" color={isActive ? 'onPrimary' : 'onSurfaceVariant'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── CreateTab ───────────────────────────────────────────────────────────────

type CreateTabProps = { code: string };

function CreateTab({ code }: CreateTabProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendChallenge(): Promise<void> {
    try {
      await Share.share({
        message: `¡Te reto en Tally! Mi código de hoy es: ${code}\nDescarga Tally y únete al reto 💪`,
      });
    } catch {
      // usuario canceló
    }
  }

  const codeStyle: TextStyle = {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 8,
    color: theme.colors.primary,
    textAlign: 'center',
  };

  const buttonStyle = (variant: 'primary' | 'outline'): ViewStyle => ({
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: variant === 'primary' ? theme.colors.primary : 'transparent',
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: theme.colors.primary,
  });

  return (
    <View style={{ gap: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
      <Card>
        <View style={{ gap: theme.spacing.md, alignItems: 'center', paddingVertical: theme.spacing.md }}>
          <Text variant="labelSm" color="onSurfaceVariant">
            TU CÓDIGO DE RETO
          </Text>
          <RNText style={codeStyle}>{code}</RNText>
          <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
            Comparte este código con un amigo para comparar el progreso de hoy
          </Text>
        </View>
      </Card>

      <Pressable
        onPress={() => { void handleCopy(); }}
        style={({ pressed }) => [buttonStyle('primary'), pressed ? { opacity: 0.8 } : null]}
        accessibilityRole="button"
        accessibilityLabel="Copiar código"
      >
        <Text variant="labelMd" color="onPrimary">
          {copied ? 'Copiado ✓' : 'Copiar código'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => { void handleSendChallenge(); }}
        style={({ pressed }) => [buttonStyle('primary'), pressed ? { opacity: 0.8 } : null]}
        accessibilityRole="button"
        accessibilityLabel="Enviar reto"
      >
        <Text variant="labelMd" color="onPrimary">
          Enviar reto
        </Text>
      </Pressable>
    </View>
  );
}

// ─── ComparisonRow ────────────────────────────────────────────────────────────

type ComparisonRowProps = {
  label: string;
  myValue: number;
  theirValue: number;
  format: (n: number) => string;
};

function ComparisonRow({ label, myValue, theirValue, format }: ComparisonRowProps) {
  const theme = useTheme();
  const myWins = myValue >= theirValue;

  const cellStyle = (winner: boolean): ViewStyle => ({
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: winner ? theme.colors.primaryContainer : 'transparent',
  });

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="labelSm" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <View style={cellStyle(myWins)}>
          <Text variant="headlineMd" color={myWins ? 'primary' : 'onSurface'}>
            {format(myValue)}
          </Text>
          <Text variant="labelSm" color="onSurfaceVariant">Tú</Text>
        </View>
        <View style={cellStyle(!myWins)}>
          <Text variant="headlineMd" color={!myWins ? 'primary' : 'onSurface'}>
            {format(theirValue)}
          </Text>
          <Text variant="labelSm" color="onSurfaceVariant">Reto</Text>
        </View>
      </View>
    </View>
  );
}

// ─── JoinTab ─────────────────────────────────────────────────────────────────

type JoinTabProps = { mySteps: number; myStreak: number };

function JoinTab({ mySteps, myStreak }: JoinTabProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState<DecodedChallenge | null>(null);
  const [error, setError] = useState(false);

  function handleVerify(): void {
    const result = decodeCode(input);
    if (result === null) {
      setDecoded(null);
      setError(true);
    } else {
      setDecoded(result);
      setError(false);
    }
  }

  const inputStyle: TextStyle = {
    borderWidth: 1,
    borderColor: error ? theme.colors.tertiary : theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
    color: theme.colors.onSurface,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
  };

  const verifyButtonStyle: ViewStyle = {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  };

  return (
    <View style={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelSm" color="onSurfaceVariant">
          CÓDIGO DE 6 CARACTERES
        </Text>
        <TextInput
          style={inputStyle}
          value={input}
          onChangeText={(t) => {
            setInput(t.toUpperCase().slice(0, 6));
            setError(false);
            setDecoded(null);
          }}
          placeholder="000000"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        {error && (
          <Text variant="labelSm" color="tertiary">
            Código inválido. Verificá que sean 6 caracteres correctos.
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleVerify}
        disabled={input.length !== 6}
        style={({ pressed }) => [
          verifyButtonStyle,
          (pressed || input.length !== 6) ? { opacity: 0.5 } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ver reto"
      >
        <Text variant="labelMd" color="onPrimary">Ver reto</Text>
      </Pressable>

      {decoded !== null && (
        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <Text variant="headlineMd" style={{ textAlign: 'center' }}>
              Comparativa
            </Text>
            <ComparisonRow
              label="PASOS HOY"
              myValue={mySteps}
              theirValue={decoded.steps}
              format={(n) => n.toLocaleString('es-AR')}
            />
            <ComparisonRow
              label="RACHA"
              myValue={myStreak}
              theirValue={decoded.streak}
              format={(n) => `${n} días`}
            />
            <Text variant="bodyMd" color="onSurfaceVariant" style={{ textAlign: 'center' }}>
              {`Misión del reto: "${decoded.missionLabel}…"`}
            </Text>
          </View>
        </Card>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChallengeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('create');

  const [snapshot] = useState(() => {
    const state = useMissionStore.getState();
    return {
      steps: 0,
      streak: state.streakState.current,
      missionLabel: state.todayMission?.title ?? '',
    };
  });

  const myCode = generateCode(snapshot.steps, snapshot.streak, snapshot.missionLabel);

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  };

  const closePressableStyle: ViewStyle = {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <KeyboardAvoidingView
      style={screenStyle}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header manual (sin headerShown nativo para control total del estilo) */}
      <View style={headerStyle}>
        <Text variant="headlineLg">Modo Reto</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={closePressableStyle}
        >
          <X size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'create' && <CreateTab code={myCode} />}
        {activeTab === 'join' && <JoinTab mySteps={snapshot.steps} myStreak={snapshot.streak} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
