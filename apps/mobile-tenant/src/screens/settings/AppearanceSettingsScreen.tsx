import { THEME_LABELS, useSettings, type ThemePreference } from '../../context/settings-context';
import { SettingsOptionGroup } from '../../components/SettingsOptionGroup';

type AppearanceSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: THEME_LABELS.light, description: 'Fond clair, texte sombre' },
  { value: 'dark', label: THEME_LABELS.dark, description: 'Mode sombre (thème complet à venir)' },
  { value: 'system', label: THEME_LABELS.system, description: 'Suit les réglages de l’appareil' },
];

export function AppearanceSettingsScreen({ mode, onBack }: AppearanceSettingsScreenProps) {
  const { theme, setTheme } = useSettings();

  return (
    <SettingsOptionGroup
      mode={mode}
      title="APPARENCE"
      subtitle="Préférence d’affichage enregistrée pour une future mise à jour du thème."
      options={OPTIONS}
      selected={theme}
      onSelect={setTheme}
      onBack={onBack}
    />
  );
}
