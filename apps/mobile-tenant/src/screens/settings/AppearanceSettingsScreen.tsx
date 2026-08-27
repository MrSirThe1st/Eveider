import { useTranslation } from 'react-i18next';
import { SettingsOptionGroup } from '../../components/SettingsOptionGroup';
import { useSettings, type ThemePreference } from '../../context/settings-context';

type AppearanceSettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

export function AppearanceSettingsScreen({ mode, onBack }: AppearanceSettingsScreenProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useSettings();

  return (
    <SettingsOptionGroup
      mode={mode}
      title={t('appearanceSettings.title')}
      subtitle={t('appearanceSettings.subtitle')}
      placeholderNote={t('appearanceSettings.note')}
      options={[
        { value: 'light', label: t('appearanceSettings.light'), description: t('appearanceSettings.lightDescription') },
        { value: 'dark', label: t('appearanceSettings.dark'), description: t('appearanceSettings.darkDescription') },
        { value: 'system', label: t('appearanceSettings.system'), description: t('appearanceSettings.systemDescription') },
      ]}
      selected={theme}
      onSelect={(value: ThemePreference) => setTheme(value)}
      onBack={onBack}
    />
  );
}
