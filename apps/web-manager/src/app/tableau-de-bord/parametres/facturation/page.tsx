'use client';

import { colors, borderSubtle, webInputStyle } from '@eveider/config-ui';
import { Button, CardListSkeleton, PageFrame, useToast } from '@eveider/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';

type PricingRules = {
  distanceThresholdKm: number;
  belowThresholdAmountFc: number;
  aboveThresholdAmountFc: number;
  sizeCoefficients: { small: number; medium: number; large: number };
};

export default function AdminBillingSettingsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchJson<{ rules: PricingRules }>('/api/pricing/delivery-rules')
      .then((data) => setRules(data.rules))
      .catch(() => toast.error('Impossible de charger les tarifs'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!rules) return;
    setSaving(true);
    try {
      const data = await fetchJson<{ rules: PricingRules }>('/api/pricing/delivery-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distanceThresholdKm: rules.distanceThresholdKm,
          belowThresholdAmountFc: rules.belowThresholdAmountFc,
          aboveThresholdAmountFc: rules.aboveThresholdAmountFc,
          smallCoefficient: rules.sizeCoefficients.small,
          mediumCoefficient: rules.sizeCoefficients.medium,
          largeCoefficient: rules.sizeCoefficients.large,
        }),
      });
      setRules(data.rules);
      toast.success('Tarifs de livraison mis à jour');
    } catch {
      toast.error('Échec de la mise à jour des tarifs');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !rules) {
    return (
      <PageFrame title="Facturation" layout="standard">
        <CardListSkeleton cards={2} />
      </PageFrame>
    );
  }

  const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };

  return (
    <PageFrame
      title="Facturation"
      description="Prix de livraison selon la distance et la taille du colis (en francs congolais). Le montant demandé au destinataire au casier se règle dans Plateforme."
      layout="standard"
    >
      <form
        onSubmit={(event) => void handleSave(event)}
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          width: '100%',
        }}
      >
        <label>
          Distance limite (km)
          <input
            type="number"
            step="0.1"
            value={rules.distanceThresholdKm}
            onChange={(e) =>
              setRules({ ...rules, distanceThresholdKm: Number(e.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label>
          Prix si plus court (FC)
          <input
            type="number"
            value={rules.belowThresholdAmountFc}
            onChange={(e) =>
              setRules({ ...rules, belowThresholdAmountFc: Number(e.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label>
          Prix si plus long (FC)
          <input
            type="number"
            value={rules.aboveThresholdAmountFc}
            onChange={(e) =>
              setRules({ ...rules, aboveThresholdAmountFc: Number(e.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem', gridColumn: '1 / -1' }}>
          <legend style={{ fontWeight: 700 }}>Multiplicateur selon la taille</legend>
          {(['small', 'medium', 'large'] as const).map((size) => (
            <label key={size} style={{ display: 'block', marginBottom: '0.75rem' }}>
              {size === 'small' ? 'Petit' : size === 'medium' ? 'Moyen' : 'Grand'}
              <input
                type="number"
                step="0.1"
                value={rules.sizeCoefficients[size]}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    sizeCoefficients: {
                      ...rules.sizeCoefficients,
                      [size]: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
            </label>
          ))}
        </fieldset>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted, gridColumn: '1 / -1' }}>
          Prix = montant de base × multiplicateur de taille.
        </p>
        <div style={{ gridColumn: '1 / -1' }}>
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </PageFrame>
  );
}
