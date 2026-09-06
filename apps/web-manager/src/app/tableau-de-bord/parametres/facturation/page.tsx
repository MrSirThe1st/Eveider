'use client';

import { colors, borderSubtle, webInputStyle } from '@eveider/config-ui';
import { Button, CardListSkeleton, PageFrame, useToast } from '@eveider/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';

type PricingRules = {
  distanceThresholdKm: number;
  belowThresholdAmount: number;
  aboveThresholdAmount: number;
  currency: 'USD' | 'CDF';
  sizeCoefficients: { small: number; medium: number; large: number };
  dropOffFeeAmount: number;
  lockerRentalRateAmount: number;
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
          belowThresholdAmount: rules.belowThresholdAmount,
          aboveThresholdAmount: rules.aboveThresholdAmount,
          currency: rules.currency,
          smallCoefficient: rules.sizeCoefficients.small,
          mediumCoefficient: rules.sizeCoefficients.medium,
          largeCoefficient: rules.sizeCoefficients.large,
          dropOffFeeAmount: rules.dropOffFeeAmount,
          lockerRentalRateAmount: rules.lockerRentalRateAmount,
        }),
      });
      setRules(data.rules);
      toast.success('Tarifs mis à jour');
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
  const currencyLabel = rules.currency === 'USD' ? 'USD' : 'CDF';

  return (
    <PageFrame
      title="Facturation"
      description="Tarifs Eveider pour la course, le dépôt marchand et la location de casier après le délai de rétention gratuit (réglé dans Casiers)."
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
          Devise
          <select
            value={rules.currency}
            onChange={(e) =>
              setRules({ ...rules, currency: e.target.value as 'USD' | 'CDF' })
            }
            style={inputStyle}
          >
            <option value="CDF">CDF (franc congolais)</option>
            <option value="USD">USD (dollar)</option>
          </select>
        </label>

        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem', gridColumn: '1 / -1' }}>
          <legend style={{ fontWeight: 700 }}>Livraison Eveider (distance × taille)</legend>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              Prix si plus court ({currencyLabel})
              <input
                type="number"
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.belowThresholdAmount}
                onChange={(e) =>
                  setRules({ ...rules, belowThresholdAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Prix si plus long ({currencyLabel})
              <input
                type="number"
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.aboveThresholdAmount}
                onChange={(e) =>
                  setRules({ ...rules, aboveThresholdAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {(['small', 'medium', 'large'] as const).map((size) => (
              <label key={size} style={{ display: 'block', marginBottom: '0.75rem' }}>
                Multiplicateur {size === 'small' ? 'Petit' : size === 'medium' ? 'Moyen' : 'Grand'}
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
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
            Prix course = montant de base × multiplicateur de taille.
          </p>
        </fieldset>

        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem', gridColumn: '1 / -1' }}>
          <legend style={{ fontWeight: 700 }}>Dépôt marchand & location casier</legend>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label>
              Frais de dépôt fixe ({currencyLabel})
              <input
                type="number"
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.dropOffFeeAmount}
                onChange={(e) =>
                  setRules({ ...rules, dropOffFeeAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Location casier / 24 h ({currencyLabel})
              <input
                type="number"
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.lockerRentalRateAmount}
                onChange={(e) =>
                  setRules({ ...rules, lockerRentalRateAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
            Le dépôt est facturé à la confirmation du dépôt. La location démarre après le délai de
            rétention gratuit (Paramètres → Casiers), uniquement pour les casiers à compartiments.
          </p>
        </fieldset>

        <div style={{ gridColumn: '1 / -1' }}>
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </PageFrame>
  );
}
