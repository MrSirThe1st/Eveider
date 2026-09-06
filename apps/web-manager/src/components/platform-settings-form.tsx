'use client';

import { PLATFORM_DEFAULT_FEATURES } from '@eveider/api-contracts';
import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import type { PlatformSettingsDto } from '@/server/platform-settings';

const FEATURE_LABELS: Record<(typeof PLATFORM_DEFAULT_FEATURES)[number], string> = {
  CREATE_SHIPMENT: 'Créer des colis',
  API_ACCESS: 'Connecter un logiciel (API)',
  COD: 'Paiement à la livraison',
  MONTHLY_INVOICE: 'Facture chaque mois',
};

const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };

type LimitKey =
  | 'defaultDailyShipments'
  | 'defaultMonthlyShipments'
  | 'defaultMaxPackageValueUsd'
  | 'defaultCodDailyLimitUsd';

type PlatformSettingsFormProps = {
  initialSettings: PlatformSettingsDto;
};

function LimitField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number | null;
  step?: string;
  onChange: (value: number | null) => void;
}) {
  const unlimited = value == null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
      <input
        type="number"
        min={0.01}
        step={step ?? '1'}
        value={unlimited ? '' : value}
        disabled={unlimited}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inputStyle, opacity: unlimited ? 0.55 : 1 }}
        placeholder={unlimited ? 'Illimité' : undefined}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => onChange(e.target.checked ? null : 1)}
        />
        Illimité
      </label>
    </div>
  );
}

export function PlatformSettingsForm({ initialSettings }: PlatformSettingsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLimit(key: LimitKey, value: number | null) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleFeature(feature: (typeof PLATFORM_DEFAULT_FEATURES)[number]) {
    setSettings((current) => {
      const enabled = current.defaultEnabledFeatures.includes(feature);
      const next = enabled
        ? current.defaultEnabledFeatures.filter((item) => item !== feature)
        : [...current.defaultEnabledFeatures, feature];
      return { ...current, defaultEnabledFeatures: next };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (settings.defaultEnabledFeatures.length === 0) {
      setError('Choisissez au moins une action possible pour les nouvelles entreprises.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<{ settings: PlatformSettingsDto }>('/api/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupFeeAmount: settings.pickupFeeAmount,
          pickupFeeCurrency: settings.pickupFeeCurrency,
          requireOrgApproval: settings.requireOrgApproval,
          defaultDailyShipments: settings.defaultDailyShipments,
          defaultMonthlyShipments: settings.defaultMonthlyShipments,
          defaultMaxPackageValueUsd: settings.defaultMaxPackageValueUsd,
          defaultCodDailyLimitUsd: settings.defaultCodDailyLimitUsd,
          defaultEnabledFeatures: settings.defaultEnabledFeatures,
          supportPhone: settings.supportPhone ?? '',
          dispatcherWhatsapp: settings.dispatcherWhatsapp ?? '',
        }),
      });
      setSettings(data.settings);
      toast.success('Paramètres enregistrés');
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Frais de retrait
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: colors.textMuted }}>
          Montant demandé au destinataire quand il paie au casier (mobile money). Le prix de
          la course (distance / taille) se règle dans Tarifs de livraison.
        </p>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            maxWidth: 480,
          }}
        >
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Montant
            </span>
            <input
              type="number"
              step="0.01"
              min={0.01}
              value={settings.pickupFeeAmount}
              onChange={(e) =>
                setSettings({ ...settings, pickupFeeAmount: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Devise
            </span>
            <input
              type="text"
              maxLength={3}
              value={settings.pickupFeeCurrency}
              onChange={(e) =>
                setSettings({ ...settings, pickupFeeCurrency: e.target.value.toUpperCase() })
              }
              style={inputStyle}
            />
          </label>
        </div>
        <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
          Paiement mobile : {settings.pawapayConfigured ? 'prêt' : 'pas encore configuré'}
        </p>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Valeurs par défaut — nouvelles entreprises
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: colors.textMuted }}>
          Appliquées à chaque nouvelle entreprise à son inscription. Les comptes déjà créés ne changent pas.
        </p>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <LimitField
            label="Colis par jour"
            value={settings.defaultDailyShipments}
            onChange={(value) => setLimit('defaultDailyShipments', value)}
          />
          <LimitField
            label="Colis par mois"
            value={settings.defaultMonthlyShipments}
            onChange={(value) => setLimit('defaultMonthlyShipments', value)}
          />
          <LimitField
            label="Valeur max d’un colis (USD)"
            value={settings.defaultMaxPackageValueUsd}
            step="0.01"
            onChange={(value) => setLimit('defaultMaxPackageValueUsd', value)}
          />
          <LimitField
            label="Paiement à la livraison — max / jour (USD)"
            value={settings.defaultCodDailyLimitUsd}
            step="0.01"
            onChange={(value) => setLimit('defaultCodDailyLimitUsd', value)}
          />
        </div>
        <div style={{ marginTop: '1.25rem', display: 'grid', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Ce qu’elles peuvent faire dès le départ
          </span>
          {PLATFORM_DEFAULT_FEATURES.map((feature) => (
            <label key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={settings.defaultEnabledFeatures.includes(feature)}
                onChange={() => toggleFeature(feature)}
              />
              <span style={{ fontSize: '0.875rem' }}>{FEATURE_LABELS[feature]}</span>
            </label>
          ))}
        </div>
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
