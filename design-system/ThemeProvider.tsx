import { createContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getTheme, type ColorScheme, type Theme } from './tokens';

export type ColorSchemePreference = ColorScheme | 'system';

export type ThemeContextValue = {
  /** Tokens del tema activo, ya resueltos. */
  theme: Theme;
  /** Esquema actualmente aplicado: 'light' | 'dark'. */
  scheme: ColorScheme;
  /** Preferencia del usuario: 'system' sigue al SO; 'light'/'dark' fuerzan. */
  preference: ColorSchemePreference;
  /** Cambia la preferencia (se usará desde Settings). */
  setPreference: (preference: ColorSchemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ColorSchemePreference>('system');

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedSystem: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
    const scheme: ColorScheme = preference === 'system' ? resolvedSystem : preference;
    return {
      theme: getTheme(scheme),
      scheme,
      preference,
      setPreference,
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
