'use client';

import { colors, borderSubtle, webInputStyle } from '@eveider/config-ui';
import { Button, CardListSkeleton, PageFrame, useToast } from '@eveider/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import type { ServiceAreaDto } from '@/lib/service-area-presenter';

type PricingRules = {
  distanceThresholdKm: number;
  belowThresholdAmount: number;
  aboveThresholdAmount: number;
  currency: 'USD' | 'CDF';
  sizeCoefficients: { small: number; medium: number; large: number };
  dropOffFeeAmount: number;
  lockerRentalRateAmount: number;
  lockerCollectionAmount: number;
  returnLockerAmount: number;
};

export default function AdminBillingSettingsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRules | null>(null);
  const [zones, setZones] = useState<ServiceAreaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchJson<{ rules: PricingRules }>('/api/pricing/delivery-rules'),
      fetchJson<{ serviceAreas: ServiceAreaDto[] }>('/api/service-areas?includeArchived=true'),
    ])
      .then(([pricing, areas]) => {
        setRules(pricing.rules);
        setZones(areas.serviceAreas);
      })
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
          lockerCollectionAmount: rules.lockerCollectionAmount,
          returnLockerAmount: rules.returnLockerAmount,
        }),
      });
      setRules(data.rules);

      await Promise.all(
        zones
          .filter((zone) => zone.status === 'active')
          .map((zone) =>
            fetch(`/api/service-areas/${zone.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                outboundDeliveryAmount: zone.outboundDeliveryAmount,
                returnDeliveryAmount: zone.returnDeliveryAmount,
              }),
            }),
          ),
      );
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
      description="Tarifs canoniques : zones pour la livraison/retour Eveider, frais fixes de casier, location après 72 h."
      layout="standard"
    >
      <form
        onSubmit={(event) => void handleSave(event)}
        style={{
          display: 'grid',
          gap: '1rem',
          width: '100%',
        }}
      >
        <label>
          Devise
          <select
            value={rules.currency}
            onChange={(e) => setRules({ ...rules, currency: e.target.value as 'USD' | 'CDF' })}
            style={inputStyle}
          >
            <option value="CDF">CDF (franc congolais)</option>
            <option value="USD">USD (dollar)</option>
          </select>
        </label>

        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem' }}>
          <legend style={{ fontWeight: 700 }}>Zones — livraison et retour Eveider</legend>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: colors.textMuted }}>
            La zone est celle du casier de destination (aller) ou du casier de retour. La taille du
            colis ne change pas le prix.
          </p>
          {zones.filter((zone) => zone.status === 'active').length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted }}>Aucune zone active.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {zones
                .filter((zone) => zone.status === 'active')
                .map((zone) => (
                  <div
                    key={zone.id}
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'minmax(160px, 1.4fr) 1fr 1fr',
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <strong>{zone.name}</strong>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>
                        {zone.code} · {zone.city}
                      </div>
                    </div>
                    <label>
                      Livraison destinataire ({currencyLabel})
                      <input
                        type="number"
                        min={0}
                        step={rules.currency === 'USD' ? '0.01' : '1'}
                        value={zone.outboundDeliveryAmount}
                        onChange={(e) =>
                          setZones((current) =>
                            current.map((item) =>
                              item.id === zone.id
                                ? { ...item, outboundDeliveryAmount: Number(e.target.value) }
                                : item,
                            ),
                          )
                        }
                        style={inputStyle}
                      />
                    </label>
                    <label>
                      Retour entreprise ({currencyLabel})
                      <input
                        type="number"
                        min={0}
                        step={rules.currency === 'USD' ? '0.01' : '1'}
                        value={zone.returnDeliveryAmount}
                        onChange={(e) =>
                          setZones((current) =>
                            current.map((item) =>
                              item.id === zone.id
                                ? { ...item, returnDeliveryAmount: Number(e.target.value) }
                                : item,
                            ),
                          )
                        }
                        style={inputStyle}
                      />
                    </label>
                  </div>
                ))}
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem' }}>
          <legend style={{ fontWeight: 700 }}>Frais fixes de casier</legend>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label>
              Collecte destinataire — dépôt marchand ({currencyLabel})
              <input
                type="number"
                min={0}
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.lockerCollectionAmount}
                onChange={(e) =>
                  setRules({ ...rules, lockerCollectionAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Retrait marchand d’un retour ({currencyLabel})
              <input
                type="number"
                min={0}
                step={rules.currency === 'USD' ? '0.01' : '1'}
                value={rules.returnLockerAmount}
                onChange={(e) =>
                  setRules({ ...rules, returnLockerAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Location casier / 24 h après rétention ({currencyLabel})
              <input
                type="number"
                min={0}
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
            La rétention gratuite (72 h par défaut) se règle dans Paramètres → Casiers. La location
            est à la charge de l’entreprise.
          </p>
        </fieldset>

        <div>
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </PageFrame>
  );
}
