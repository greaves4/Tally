import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './tokens';

/**
 * Devuelve el tema activo. Lanza si se usa fuera de <ThemeProvider>.
 * Componentes que solo necesitan colores/tipografía usan este hook.
 */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/**
 * Devuelve el contexto completo (tema + control de preferencia).
 * Usar solo donde se cambia la preferencia (ej: selector en Settings).
 */
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme/useThemeContext must be used inside a <ThemeProvider>');
  }
  return ctx;
}
