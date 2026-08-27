import { colorPalettes, type ColorTokens } from '@eveider/config-ui';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { useSettings } from './context/settings-context';

export type ColorScheme = 'light' | 'dark';

type ThemeValue = {
  colors: ColorTokens;
  scheme: ColorScheme;
  navigationTheme: Theme;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useSettings();
  const system = useColorScheme();
  const scheme: ColorScheme = theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;
  const colors = colorPalettes[scheme];

  const value = useMemo<ThemeValue>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      colors,
      scheme,
      navigationTheme: {
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.secondary,
          border: colors.border,
          notification: colors.danger,
        },
      },
    };
  }, [colors, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function useColors(): ColorTokens {
  return useAppTheme().colors;
}
