import { useTranslation } from 'react-i18next';
import { SettingsOptionGroup } from '../../components/SettingsOptionGroup';
import { useSettings, type AppCountry } from '../../context/settings-context';
import { APP_COUNTRIES } from '../../lib/countries';

type CountrySettingsScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

export function CountrySettingsScreen({ mode, onBack }: CountrySettingsScreenProps) {
  const { t } = useTranslation();
  const { country, setCountry } = useSettings();

  return (
    <SettingsOptionGroup
      mode={mode}
      title={t('countrySettings.title')}
      subtitle={t('countrySettings.subtitle')}
      placeholderNote={t('countrySettings.note')}
      options={APP_COUNTRIES.map((item) => ({
        value: item.code,
        label: t(`countries.${item.code}`),
      }))}
      selected={country}
      onSelect={(value: AppCountry) => setCountry(value)}
      onBack={onBack}
    />
  );
}
