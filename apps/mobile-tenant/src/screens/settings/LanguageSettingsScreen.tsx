import { useTranslation } from 'react-i18next';
import { SettingsOptionGroup } from '../../components/SettingsOptionGroup';
import { LANGUAGE_LABELS, useSettings, type AppLanguage } from '../../context/settings-context';

type LanguageSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

export function LanguageSettingsScreen({ mode, onBack }: LanguageSettingsScreenProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();

  return (
    <SettingsOptionGroup
      mode={mode}
      title={t('languageSettings.title')}
      subtitle={t('languageSettings.subtitle')}
      placeholderNote={t('languageSettings.note')}
      options={[
        { value: 'fr', label: LANGUAGE_LABELS.fr, description: t('languageSettings.frDescription') },
        { value: 'en', label: LANGUAGE_LABELS.en, description: t('languageSettings.enDescription') },
      ]}
      selected={language}
      onSelect={(value: AppLanguage) => setLanguage(value)}
      onBack={onBack}
    />
  );
}
