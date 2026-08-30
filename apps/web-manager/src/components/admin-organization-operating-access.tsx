'use client';

import { PLATFORM_DEFAULT_FEATURES } from '@eveider/api-contracts';
import { colors, spacing, typography, webInputStyle } from '@eveider/config-ui';
import { Button, Card, CardHeader, InlineAlert, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import type { OrganizationOperatingAccessDto } from '@/server/organizations';

const FEATURE_LABELS: Record<(typeof PLATFORM_DEFAULT_FEATURES)[number], string> = {
  CREATE_SHIPMENT: 'Créer des colis',
  API_ACCESS: 'Connecter un logiciel (API)',
  COD: 'Paiement à la livraison',
  MONTHLY_INVOICE: 'Facture chaque mois',
};

const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };

type AdminOrganizationOperatingAccessProps = {
  organizationId: string;
  initialAccess: OrganizationOperatingAccessDto;
};

export function AdminOrganizationOperatingAccess({
  organizationId,
  initialAccess,
}: AdminOrganizationOperatingAccessProps) {
  const router = useRouter();
  const toast = useToast();
  const [access, setAccess] = useState(initialAccess);
  const [saving, setSaving] = useState(false);
  const [applyingDefaults, setApplyingDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFeature(feature: (typeof PLATFORM_DEFAULT_FEATURES)[number]) {
    setAccess((current) => {
      const enabled = current.enabledFeatures.includes(feature);
      const next = enabled
        ? current.enabledFeatures.filter((item) => item !== feature)
        : [...current.enabledFeatures, feature];
      return { ...current, enabledFeatures: next };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (access.enabledFeatures.length === 0) {
      setError('Activez au moins une fonction pour cette organisation.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<{ access: OrganizationOperatingAccessDto }>(
        `/api/businesses/${organizationId}/operating-access`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(access),
        },
      );
      setAccess(data.access);
      toast.success('Accès et plafonds enregistrés');
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyDefaults() {
    setApplyingDefaults(true);
    setError(null);
    try {
      const data = await fetchJson<{ access: OrganizationOperatingAccessDto }>(
        `/api/businesses/${organizationId}/operating-access/apply-defaults`,
        { method: 'POST' },
      );
      setAccess(data.access);
      toast.success('Défauts plateforme appliqués');
      router.refresh();
    } catch {
      setError('Application des défauts impossible.');
    } finally {
      setApplyingDefaults(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Accès & plafonds"
        description="Fonctions et limites opérationnelles pour cette organisation. Indépendant de la vérification."
      />
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: spacing[5] }}>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <label>
            Colis / jour
            <input
              type="number"
              min={1}
              value={access.dailyShipments}
              onChange={(e) =>
                setAccess({ ...access, dailyShipments: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            Colis / mois
            <input
              type="number"
              min={1}
              value={access.monthlyShipments}
              onChange={(e) =>
                setAccess({ ...access, monthlyShipments: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            Valeur max colis (USD)
            <input
              type="number"
              step="0.01"
              min={0.01}
              value={access.maxPackageValueUsd}
              onChange={(e) =>
                setAccess({ ...access, maxPackageValueUsd: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            Plafond COD / jour (USD)
            <input
              type="number"
              step="0.01"
              min={0.01}
              value={access.codDailyLimitUsd}
              onChange={(e) =>
                setAccess({ ...access, codDailyLimitUsd: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: typography.caption.fontSize, fontWeight: 600 }}>
            Fonctions activées
          </span>
          {PLATFORM_DEFAULT_FEATURES.map((feature) => (
            <label key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={access.enabledFeatures.includes(feature)}
                onChange={() => toggleFeature(feature)}
              />
              <span style={{ fontSize: typography.body.fontSize }}>{FEATURE_LABELS[feature]}</span>
            </label>
          ))}
        </div>

        {error ? <InlineAlert message={error} variant="error" /> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3] }}>
          <Button type="submit" variant="primary" loading={saving}>
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={applyingDefaults}
            onClick={() => void handleApplyDefaults()}
          >
            Appliquer les défauts plateforme
          </Button>
        </div>
        <p style={{ margin: 0, fontSize: typography.caption.fontSize, color: colors.textMuted }}>
          Les défauts viennent de Paramètres → Plateforme. Ils ne s’appliquent pas automatiquement
          aux organisations existantes.
        </p>
      </form>
    </Card>
  );
}
