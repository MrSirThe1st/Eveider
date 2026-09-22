'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiFetchError, fetchJson } from '@/lib/api/fetch-json';
import type { PlatformSettingsDto } from '@/server/platform-settings';

const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };

type PlatformSettingsFormProps = {
  initialSettings: PlatformSettingsDto;
};

function settingsPayload(settings: PlatformSettingsDto) {
  return {
    pickupFeeAmount: settings.pickupFeeAmount,
    platformCurrency: settings.platformCurrency,
    requireOrgApproval: settings.requireOrgApproval,
    defaultDailyShipments: settings.defaultDailyShipments,
    defaultMonthlyShipments: settings.defaultMonthlyShipments,
    defaultMaxPackageValueUsd: settings.defaultMaxPackageValueUsd,
    defaultCodDailyLimitUsd: settings.defaultCodDailyLimitUsd,
    defaultEnabledFeatures: settings.defaultEnabledFeatures,
    supportPhone: settings.supportPhone ?? '',
    dispatcherWhatsapp: settings.dispatcherWhatsapp ?? '',
  };
}

export function PlatformSettingsForm({ initialSettings }: PlatformSettingsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(next: PlatformSettingsDto, successMessage: string) {
    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<{ settings: PlatformSettingsDto }>('/api/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(settingsPayload(next)),
      });
      setSettings(data.settings);
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiFetchError ? err.message : 'Enregistrement impossible.');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await saveSettings(settings, 'Paramètres enregistrés');
    } catch {
      // Error is already shown on the form.
    }
  }

  function handleCurrencyChange(platformCurrency: 'USD' | 'CDF') {
    if (platformCurrency === settings.platformCurrency || saving) return;
    const previous = settings.platformCurrency;
    const next = { ...settings, platformCurrency };
    setSettings(next);
    void saveSettings(next, 'Devise enregistrée').catch(() => {
      setSettings((current) =>
        current.platformCurrency === platformCurrency
          ? { ...current, platformCurrency: previous }
          : current,
      );
    });
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Devise de la plateforme
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: colors.textMuted }}>
          Tous les nouveaux tarifs et toutes les nouvelles facturations utilisent cette devise.
          Les montants déjà facturés ne changent pas. Le choix est enregistré immédiatement.
        </p>
        <label style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Devise</span>
          <select
            value={settings.platformCurrency}
            disabled={saving}
            onChange={(e) => handleCurrencyChange(e.target.value as 'USD' | 'CDF')}
            style={inputStyle}
          >
            <option value="CDF">CDF (franc congolais)</option>
            <option value="USD">USD (dollar)</option>
          </select>
        </label>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Contact
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: colors.textMuted }}>
          Numéros affichés dans l’app pour joindre Eveider.
        </p>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            maxWidth: 560,
          }}
        >
          <label>
            Téléphone d’aide
            <input
              type="text"
              value={settings.supportPhone ?? ''}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              style={inputStyle}
              placeholder="+243…"
            />
          </label>
          <label>
            WhatsApp des tournées
            <input
              type="text"
              value={settings.dispatcherWhatsapp ?? ''}
              onChange={(e) => setSettings({ ...settings, dispatcherWhatsapp: e.target.value })}
              style={inputStyle}
              placeholder="+243…"
            />
          </label>
        </div>
      </section>

      {error ? <InlineAlert message={error} variant="error" /> : null}

      <div>
        <Button type="submit" variant="primary" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
