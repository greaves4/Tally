import { Tabs } from 'expo-router';
import { BarChart3, Home, Settings } from 'lucide-react-native';
import { useTheme } from '@/design-system/useTheme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainerLow,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.labelSm.fontFamily,
          fontSize: theme.typography.labelSm.fontSize,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          tabBarAccessibilityLabel: 'Pestaña Hoy',
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
          tabBarAccessibilityLabel: 'Pestaña Progreso',
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          tabBarAccessibilityLabel: 'Pestaña Ajustes',
        }}
      />
    </Tabs>
  );
}
