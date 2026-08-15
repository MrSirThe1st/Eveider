import { LANGUAGE_LABELS, useSettings, type AppLanguage } from '../../context/settings-context';
import { SettingsOptionGroup } from '../../components/SettingsOptionGroup';

type LanguageSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

const OPTIONS: { value: AppLanguage; label: string; description: string }[] = [
  { value: 'fr', label: LANGUAGE_LABELS.fr, description: 'Interface en français (par défaut)' },
  { value: 'en', label: LANGUAGE_LABELS.en, description: 'English interface (coming soon)' },
];

export function LanguageSettingsScreen({ mode, onBack }: LanguageSettingsScreenProps) {
  const { language, setLanguage } = useSettings();

  return (
    <SettingsOptionGroup
      mode={mode}
      title="LANGUE"
      subtitle="Choisissez la langue de l’application. La traduction complète sera activée ultérieurement."
      options={OPTIONS}
      selected={language}
      onSelect={setLanguage}
      onBack={onBack}
    />
  );
}
