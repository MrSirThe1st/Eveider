import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'fr' | 'en';
export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsState = {
  language: AppLanguage;
  theme: ThemePreference;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

type SettingsContextValue = SettingsState & {
  ready: boolean;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: ThemePreference) => void;
  setPushNotifications: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setSmsNotifications: (enabled: boolean) => void;
};

const STORAGE_KEY = '@eveider/mobile-settings/v1';

const DEFAULT_SETTINGS: SettingsState = {
  language: 'fr',
  theme: 'system',
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  fr: 'Français',
  en: 'English',
};

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Automatique',
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SettingsState>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // Keep defaults when storage is unavailable.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((patch: Partial<SettingsState>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      ready,
      setLanguage: (language) => persist({ language }),
      setTheme: (theme) => persist({ theme }),
      setPushNotifications: (pushNotifications) => persist({ pushNotifications }),
      setEmailNotifications: (emailNotifications) => persist({ emailNotifications }),
      setSmsNotifications: (smsNotifications) => persist({ smsNotifications }),
    }),
    [persist, ready, settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
