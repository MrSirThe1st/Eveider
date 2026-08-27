import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n, { isAppLanguage, type AppLanguage as I18nLanguage } from '../i18n';
import { DEFAULT_COUNTRY, isAppCountry, type AppCountry } from '../lib/countries';

export type AppLanguage = I18nLanguage;
export type { AppCountry };
export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsState = {
  language: AppLanguage;
  country: AppCountry;
  setupComplete: boolean;
  theme: ThemePreference;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

type SettingsContextValue = SettingsState & {
  ready: boolean;
  setLanguage: (language: AppLanguage) => void;
  setCountry: (country: AppCountry) => void;
  setTheme: (theme: ThemePreference) => void;
  setPushNotifications: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setSmsNotifications: (enabled: boolean) => void;
  completeSetup: (input: { language: AppLanguage; country: AppCountry }) => void;
};

const STORAGE_KEY = '@eveider/mobile-settings/v1';

const DEFAULT_SETTINGS: SettingsState = {
  language: 'fr',
  country: DEFAULT_COUNTRY,
  setupComplete: false,
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

function parseSettings(raw: string): SettingsState {
  const parsed = JSON.parse(raw) as Partial<SettingsState>;
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    language: isAppLanguage(parsed.language) ? parsed.language : DEFAULT_SETTINGS.language,
    country: isAppCountry(parsed.country) ? parsed.country : DEFAULT_SETTINGS.country,
    setupComplete: parsed.setupComplete === true,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const next = parseSettings(raw);
          setSettings(next);
          if (next.language !== i18n.language) {
            void i18n.changeLanguage(next.language);
          }
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
      if (patch.language && patch.language !== i18n.language) {
        void i18n.changeLanguage(patch.language);
      }
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      ready,
      setLanguage: (language) => persist({ language }),
      setCountry: (country) => persist({ country }),
      setTheme: (theme) => persist({ theme }),
      setPushNotifications: (pushNotifications) => persist({ pushNotifications }),
      setEmailNotifications: (emailNotifications) => persist({ emailNotifications }),
      setSmsNotifications: (smsNotifications) => persist({ smsNotifications }),
      completeSetup: ({ language, country }) => persist({ language, country, setupComplete: true }),
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
