'use client';

import { borderSubtle, colors, webInputStyle } from '@eveider/config-ui';
import { Button, CardListSkeleton, PageFrame, useToast } from '@eveider/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import {
  formatZoneDisplayName,
  formatZonePriceAmount,
  groupZonesByCity,
  parsePriceInput,
  zoneNeedsPricing,
} from '@/lib/geography-presentation';
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

function priceFieldValue(amount: number | null): string {
  return amount == null ? '' : String(amount);
}

export default function AdminBillingSettingsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRules | null>(null);
  const [zones, setZones] = useState<ServiceAreaDto[]>([]);
  const [pickupHoldHours, setPickupHoldHours] = useState(72);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchJson<{ rules: PricingRules }>('/api/pricing/delivery-rules'),
      fetchJson<{ serviceAreas: ServiceAreaDto[] }>('/api/service-areas?includeArchived=true'),
      fetchJson<{ settings: { pickupHoldHours: number } }>('/api/locker-settings'),
    ])
      .then(([pricing, areas, lockers]) => {
        setRules(pricing.rules);
        setZones(areas.serviceAreas);
        setPickupHoldHours(lockers.settings.pickupHoldHours);
      })
      .catch(() => toast.error('Impossible de charger les tarifs'))
      .finally(() => setLoading(false));
  }, [toast]);

  const activeZones = useMemo(() => zones.filter((zone) => zone.status === 'active'), [zones]);
  const cityGroups = useMemo(() => groupZonesByCity(activeZones), [activeZones]);
  const unconfiguredCount = useMemo(
    () =>
      activeZones.filter((zone) =>
        zoneNeedsPricing(zone.outboundDeliveryAmount, zone.returnDeliveryAmount),
      ).length,
    [activeZones],
  );

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
        activeZones.map((zone) =>
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
      <PageFrame title="Tarifs de livraison" layout="standard">
        <CardListSkeleton cards={2} />
      </PageFrame>
    );
  }

  const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };
  const currencyLabel = rules.currency === 'USD' ? 'USD' : 'CDF';
  const step = rules.currency === 'USD' ? '0.01' : '1';

  return (
    <PageFrame
      title="Tarifs de livraison"
      description={`Livraison Eveider par zone, frais fixes de casier, stockage après ${pickupHoldHours} h. Champ vide = non configuré. 0 = gratuit.`}
      layout="standard"
    >
      <form
        onSubmit={(event) => void handleSave(event)}
        style={{
          display: 'grid',
          gap: '1.25rem',
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
          <legend style={{ fontWeight: 700 }}>Livraison Eveider par zone</legend>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: colors.textMuted }}>
            Livraison destinataire — payée par le destinataire. Retour Eveider — payé par
            l’entreprise. Laissez vide pour « Non configuré ». Saisissez 0 pour rendre le transport
            gratuit.
          </p>
          {unconfiguredCount > 0 ? (
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', fontWeight: 600, color: colors.warningFg }}>
              {unconfiguredCount} zone{unconfiguredCount > 1 ? 's' : ''} à configurer
            </p>
          ) : null}
          {activeZones.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted }}>Aucune zone active.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {cityGroups.map((group) => (
                <section key={group.cityId ?? group.city}>
                  <h3 style={{ margin: '0 0 0.65rem', fontSize: '0.9375rem', fontWeight: 700 }}>
                    {group.city}
                  </h3>
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {group.zones.map((zone) => {
                      const needsConfig = zoneNeedsPricing(
                        zone.outboundDeliveryAmount,
                        zone.returnDeliveryAmount,
                      );
                      return (
                        <div
                          key={zone.id}
                          id={`zone-${zone.id}`}
                          style={{
                            display: 'grid',
                            gap: '0.75rem',
                            gridTemplateColumns: 'minmax(160px, 1.2fr) 1fr 1fr',
                            alignItems: 'end',
                          }}
                        >
                          <div>
                            <strong>{formatZoneDisplayName(zone)}</strong>
                            <div style={{ fontSize: 12, color: colors.textMuted }}>
                              {zone.code}
                              {needsConfig ? ' · Non configuré' : ''}
                            </div>
                          </div>
                          <label>
                            Livraison destinataire ({currencyLabel})
                            <input
                              type="number"
                              min={0}
                              step={step}
                              inputMode="decimal"
                              placeholder="Non configuré"
                              value={priceFieldValue(zone.outboundDeliveryAmount)}
                              aria-label={`Livraison destinataire ${formatZoneDisplayName(zone)}`}
                              onChange={(e) =>
                                setZones((current) =>
                                  current.map((item) =>
                                    item.id === zone.id
                                      ? { ...item, outboundDeliveryAmount: parsePriceInput(e.target.value) }
                                      : item,
                                  ),
                                )
                              }
                              style={inputStyle}
                            />
                            <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                              {formatZonePriceAmount(zone.outboundDeliveryAmount, currencyLabel).label}
                            </span>
                          </label>
                          <label>
                            Retour Eveider ({currencyLabel})
                            <input
                              type="number"
                              min={0}
                              step={step}
                              inputMode="decimal"
                              placeholder="Non configuré"
                              value={priceFieldValue(zone.returnDeliveryAmount)}
                              aria-label={`Retour Eveider ${formatZoneDisplayName(zone)}`}
                              onChange={(e) =>
                                setZones((current) =>
                                  current.map((item) =>
                                    item.id === zone.id
                                      ? { ...item, returnDeliveryAmount: parsePriceInput(e.target.value) }
                                      : item,
                                  ),
                                )
                              }
                              style={inputStyle}
                            />
                            <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                              {formatZonePriceAmount(zone.returnDeliveryAmount, currencyLabel).label}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: borderSubtle(), borderRadius: 8, padding: '1rem' }}>
          <legend style={{ fontWeight: 700 }}>Frais fixes</legend>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label>
              Flow 2 / retrait destinataire ({currencyLabel})
              <input
                type="number"
                min={0}
                step={step}
                value={rules.lockerCollectionAmount}
                aria-label="Flow 2 / retrait destinataire"
                onChange={(e) =>
                  setRules({ ...rules, lockerCollectionAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Flow 3B / retrait retour par entreprise ({currencyLabel})
              <input
                type="number"
                min={0}
                step={step}
                value={rules.returnLockerAmount}
                aria-label="Flow 3B / retrait retour par entreprise"
                onChange={(e) =>
                  setRules({ ...rules, returnLockerAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
            <label>
              Stockage / 24 h après {pickupHoldHours} h gratuites ({currencyLabel})
              <input
                type="number"
                min={0}
                step={step}
                value={rules.lockerRentalRateAmount}
                aria-label={`Stockage / 24h after ${pickupHoldHours} h`}
                onChange={(e) =>
                  setRules({ ...rules, lockerRentalRateAmount: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </label>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
            Flow 2 / retrait destinataire : payé par le destinataire. Flow 3B / retrait retour par
            l’entreprise : payé par l’entreprise. Stockage après période gratuite : payé par
            l’entreprise. La rétention gratuite ({pickupHoldHours} h) se règle dans Paramètres → Casiers.
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
