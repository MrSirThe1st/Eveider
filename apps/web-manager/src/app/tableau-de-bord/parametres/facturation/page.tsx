'use client';

import { colors, typography, webCardStyle } from '@eveider/config-ui';
import { Button, CardListSkeleton, Disclosure, PageFrame, useToast } from '@eveider/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { TariffPriceStepper } from '@/components/tariff-price-stepper';
import { fetchJson } from '@/lib/api/fetch-json';
import {
  cityTariffStatusLabel,
  groupZonesByCity,
  zoneNeedsPricing,
} from '@/lib/geography-presentation';
import type { ServiceAreaDto } from '@/lib/service-area-presenter';
import { ADMIN_SETTINGS_ROUTES } from '@/lib/settings-nav';

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

/** A zone named like its city needs a prefix so the heading is not repeated. */
function zoneSectionTitle(zoneName: string, cityName: string): string {
  const sameName =
    zoneName.localeCompare(cityName, 'fr', { sensitivity: 'accent' }) === 0;
  return sameName ? `Zone ${zoneName}` : zoneName;
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
      <PageFrame title="Tarifs" layout="standard">
        <CardListSkeleton cards={2} />
      </PageFrame>
    );
  }

  const currencyLabel = rules.currency === 'USD' ? 'USD' : 'CDF';

  function updateZonePrice(
    zoneId: string,
    field: 'outboundDeliveryAmount' | 'returnDeliveryAmount',
    amount: number | null,
  ) {
    setZones((current) =>
      current.map((item) => (item.id === zoneId ? { ...item, [field]: amount } : item)),
    );
  }

  return (
    <PageFrame
      title="Tarifs"
      description="Configurez les tarifs appliqués aux services Eveider."
      layout="standard"
    >
      <form
        onSubmit={(event) => void handleSave(event)}
        style={{ display: 'grid', gap: '1.5rem', width: '100%' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: typography.bodySm.fontSize, color: colors.secondary }}>
            Devise : <strong>{currencyLabel}</strong>
          </p>
          <Link
            href={ADMIN_SETTINGS_ROUTES.platform}
            style={{ color: colors.primary, fontWeight: 600, fontSize: typography.bodySm.fontSize }}
          >
            Modifier
          </Link>
        </div>

        <section style={{ ...webCardStyle, padding: '1.25rem 1.5rem' }} aria-labelledby="tarifs-transport">
          <h2 id="tarifs-transport" style={sectionOverlineStyle}>
            Transport Eveider
          </h2>
          <p style={sectionHintStyle}>
            Saisissez le montant, ou utilisez + et −. 0 rend le transport gratuit. Laissez vide pour
            un tarif non configuré.
          </p>
          {unconfiguredCount > 0 ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: colors.warningFg }}>
              {unconfiguredCount} zone{unconfiguredCount > 1 ? 's' : ''} à configurer
            </p>
          ) : null}

          {activeZones.length === 0 ? (
            <p style={{ margin: '1.25rem 0 0', color: colors.textMuted }}>Aucune zone active.</p>
          ) : (
            <div style={{ marginTop: '0.75rem', borderBottom: `1px solid ${colors.borderSubtle}` }}>
              {cityGroups.map((group) => {
                const status = cityTariffStatusLabel(group.zones, rules.currency);
                return (
                <Disclosure
                  key={group.cityId ?? group.city}
                  style={{
                    marginTop: 0,
                    borderTop: `1px solid ${colors.borderSubtle}`,
                    padding: '0.65rem 0',
                  }}
                  summary={
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        width: '100%',
                      }}
                    >
                      <span style={{ color: colors.secondary, fontSize: '1rem', fontWeight: 700 }}>
                        {group.city}
                      </span>
                      <span
                        style={{
                          color: status === 'Non configuré' ? colors.textMuted : colors.primary,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status}
                      </span>
                    </span>
                  }
                >
                  <div style={{ display: 'grid', gap: '1rem', marginTop: '0.85rem' }}>
                    {group.zones.map((zone) => (
                      <div
                        key={zone.id}
                        id={`zone-${zone.id}`}
                        style={zoneBlockStyle}
                      >
                        <h4 style={zoneHeadingStyle}>{zoneSectionTitle(zone.name, group.city)}</h4>
                        <TariffPriceStepper
                          id={`livraison-${zone.id}`}
                          label="Livraison"
                          hint="Eveider transporte le colis jusqu’au casier de destination."
                          payer="recipient"
                          ariaLabel={`Livraison ${zone.name}`}
                          amount={zone.outboundDeliveryAmount}
                          currency={rules.currency}
                          nullable
                          onChange={(amount) => updateZonePrice(zone.id, 'outboundDeliveryAmount', amount)}
                        />
                        <div style={feeDividerStyle} role="separator" />
                        <TariffPriceStepper
                          id={`retour-${zone.id}`}
                          label="Retour du colis à l’entreprise"
                          hint="Eveider récupère le colis retourné au casier et le ramène à l’entreprise."
                          payer="business"
                          ariaLabel={`Retour du colis à l’entreprise ${zone.name}`}
                          amount={zone.returnDeliveryAmount}
                          currency={rules.currency}
                          nullable
                          onChange={(amount) => updateZonePrice(zone.id, 'returnDeliveryAmount', amount)}
                        />
                      </div>
                    ))}
                  </div>
                </Disclosure>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ ...webCardStyle, padding: '1.25rem 1.5rem' }} aria-labelledby="tarifs-casier">
          <h2 id="tarifs-casier" style={sectionOverlineStyle}>
            Frais de casier
          </h2>
          <div style={{ display: 'grid', gap: '0', marginTop: '1.25rem' }}>
            <TariffPriceStepper
              id="retrait-casier"
              label="Retrait au casier"
              hint="Le destinataire vient retirer au casier un colis déposé par l’entreprise."
              payer="recipient"
              ariaLabel="Retrait au casier"
              amount={rules.lockerCollectionAmount}
              currency={rules.currency}
              onChange={(amount) =>
                setRules({ ...rules, lockerCollectionAmount: amount ?? 0 })
              }
            />
            <div style={{ ...feeDividerStyle, margin: '1.15rem 0' }} role="separator" />
            <TariffPriceStepper
              id="retrait-retour"
              label="Retrait d’un colis retourné par l’entreprise"
              hint="Le destinataire dépose le colis retourné au casier, et l’entreprise vient le récupérer."
              payer="business"
              ariaLabel="Retrait d’un colis retourné par l’entreprise"
              amount={rules.returnLockerAmount}
              currency={rules.currency}
              onChange={(amount) => setRules({ ...rules, returnLockerAmount: amount ?? 0 })}
            />
            <div style={{ ...feeDividerStyle, margin: '1.15rem 0' }} role="separator" />
            <TariffPriceStepper
              id="stockage-supplementaire"
              label="Stockage prolongé au casier"
              hint={`Quand le colis reste au casier après les ${pickupHoldHours} h incluses — facturé par tranche de 24 h.`}
              payer="business"
              ariaLabel="Stockage prolongé au casier"
              amount={rules.lockerRentalRateAmount}
              currency={rules.currency}
              onChange={(amount) =>
                setRules({ ...rules, lockerRentalRateAmount: amount ?? 0 })
              }
            />
          </div>
        </section>

        <div>
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </PageFrame>
  );
}

const sectionOverlineStyle = {
  margin: 0,
  color: colors.textMuted,
  fontSize: typography.overline.fontSize,
  lineHeight: typography.overline.lineHeight,
  fontWeight: typography.overline.fontWeight,
  letterSpacing: typography.overline.letterSpacing,
  textTransform: typography.overline.textTransform,
} as const;

const sectionHintStyle = {
  margin: '0.5rem 0 0',
  maxWidth: '40rem',
  fontSize: typography.bodySm.fontSize,
  lineHeight: typography.bodySm.lineHeight,
  color: colors.textMuted,
} as const;

const zoneBlockStyle = {
  display: 'grid',
  gap: '0.85rem',
  padding: '1rem 1.1rem',
  borderRadius: 10,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.surfaceSubtle,
} as const;

const feeDividerStyle = {
  height: 1,
  margin: '0.15rem 0',
  background: colors.borderSubtle,
} as const;

const zoneHeadingStyle = {
  margin: 0,
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
} as const;
