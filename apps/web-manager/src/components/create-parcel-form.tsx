'use client';

import { colors, borderSubtle } from '@eveider/config-ui';
import { PACKAGE_SIZE_LABELS, PACKAGE_SIZES, formatDeliveryFee, type DeliveryPricingCurrency, type PackageSize, type ShipmentPickupType } from '@eveider/domain';
import { InlineAlert, TextField, PhoneField, Wizard, type WizardStep, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LockerPicker } from '@/components/locker-picker';
import type { LockerOption } from '@/components/locker-card';
import { getFulfillmentMethodLabel } from '@/lib/business-presentation';
import type { PickupLocationDto } from '@/lib/pickup-location-presenter';
import { WEB_ROUTES } from '@/lib/auth-routing';

const STEPS: WizardStep[] = [
  { id: 'method', title: 'Méthode', description: 'Comment le colis entre dans le réseau Eveider.' },
  { id: 'recipient', title: 'Destinataire', description: 'Qui retirera le colis ?' },
  { id: 'package', title: 'Colis', description: 'Taille pour le casier, et référence si utile.' },
  { id: 'locker', title: 'Casier', description: 'Casier Eveider de destination.' },
  { id: 'review', title: 'Revue', description: 'Vérifiez avant de créer le colis.' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const METHOD_COPY: Record<ShipmentPickupType, { title: string; body: string }> = {
  courier_pickup: {
    title: 'Collecte Eveider',
    body: 'Un chauffeur Eveider vient récupérer le colis auprès de votre entreprise.',
  },
  merchant_dropoff: {
    title: 'Dépôt au casier',
    body: 'Vous apportez vous-même le colis au casier Eveider sélectionné.',
  },
};

type CreateParcelFormProps = {
  initialLockerId?: string;
};

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: '0.2rem' }}>
      <dt
        style={{
          margin: 0,
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: colors.textMuted,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: colors.secondary }}>
        {children}
      </dd>
    </div>
  );
}

export function CreateParcelForm({ initialLockerId }: CreateParcelFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [stepIndex, setStepIndex] = useState(0);

  const [pickupType, setPickupType] = useState<ShipmentPickupType>('courier_pickup');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [pickupLocations, setPickupLocations] = useState<PickupLocationDto[]>([]);
  const [senderLocationName, setSenderLocationName] = useState<string | null>(null);
  const [senderLat, setSenderLat] = useState<number | null>(null);
  const [senderLng, setSenderLng] = useState<number | null>(null);
  const [senderInstructions, setSenderInstructions] = useState<string | null>(null);

  const [reference, setReference] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  const [lockerId, setLockerId] = useState(
    initialLockerId && UUID_RE.test(initialLockerId) ? initialLockerId : '',
  );
  const [lockers, setLockers] = useState<LockerOption[]>([]);
  const [packageSize, setPackageSize] = useState<PackageSize>('medium');
  const [deliveryQuoteLabel, setDeliveryQuoteLabel] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/organisation/shipment-prefill')
      .then((res) => res.json())
      .then((result) => {
        if (!result.success) return;
        const data = result.data as {
          senderName?: string;
          senderPhone?: string;
          senderAddress?: string | null;
          pickupType?: ShipmentPickupType;
          dropoffLockerId?: string | null;
          pickupLocationId?: string | null;
          pickupLocations?: PickupLocationDto[];
        };
        const locations = data.pickupLocations ?? [];
        setPickupLocations(locations);
        const selected =
          locations.find((location) => location.id === data.pickupLocationId) ??
          locations.find((location) => location.isDefault) ??
          locations[0] ??
          null;
        if (selected) {
          applyPickupLocation(selected, { overrideContact: true });
        } else {
          if (data.senderName) setSenderName(data.senderName);
          if (data.senderPhone) setSenderPhone(data.senderPhone);
          if (data.senderAddress) setSenderAddress(data.senderAddress);
        }
        if (data.pickupType) setPickupType(data.pickupType);
        if (data.dropoffLockerId && UUID_RE.test(data.dropoffLockerId)) {
          setLockerId((current) => current || data.dropoffLockerId!);
        }
      })
      .catch(() => {
        /* prefill optional */
      });
  }, []);

  function applyPickupLocation(
    location: PickupLocationDto,
    options?: { overrideContact?: boolean },
  ) {
    setPickupLocationId(location.id);
    setSenderAddress(location.street);
    setSenderLocationName(location.name);
    setSenderLat(location.lat);
    setSenderLng(location.lng);
    setSenderInstructions(location.instructions);
    if (options?.overrideContact !== false) {
      if (location.contactPerson) setSenderName(location.contactPerson);
      if (location.contactPhone) setSenderPhone(location.contactPhone);
    }
  }

  const selectedPickupLocation = useMemo(
    () => pickupLocations.find((location) => location.id === pickupLocationId) ?? null,
    [pickupLocations, pickupLocationId],
  );

  useEffect(() => {
    void fetch('/api/organisation/lockers')
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          const all = result.data.lockers as LockerOption[];
          setLockers(
            all.filter(
              (locker) =>
                locker.selectable !== false && (locker.type == null || locker.type === 'SMART_LOCKER'),
            ),
          );
        }
      })
      .catch(() => {
        /* lockers optional */
      });
  }, []);

  const selectedLocker = useMemo(
    () => lockers.find((locker) => locker.id === lockerId) ?? null,
    [lockers, lockerId],
  );

  useEffect(() => {
    if (!lockerId) {
      setDeliveryQuoteLabel(null);
      return;
    }
    const params = new URLSearchParams({ lockerId, pickupType, packageSize });
    if (pickupType === 'courier_pickup' && senderAddress.trim()) {
      params.set('senderAddress', senderAddress.trim());
    }

    let cancelled = false;
    void fetch(`/api/organisation/delivery-quote?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          const amount = Number(json.data.deliveryFeeAmount);
          const currency = (json.data.deliveryFeeCurrency === 'USD' ? 'USD' : 'CDF') as DeliveryPricingCurrency;
          // Format from amount + platform currency — never invent a $ display for CDF.
          setDeliveryQuoteLabel(
            Number.isFinite(amount)
              ? formatDeliveryFee(amount, currency)
              : ((json.data.deliveryFeeLabel as string | undefined) ?? null),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryQuoteLabel(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lockerId, packageSize, pickupType, senderAddress]);

  function validateMethod(): boolean {
    if (senderName.trim().length < 2) {
      setError('Indiquez la personne à joindre.');
      return false;
    }
    if (!senderPhone.trim()) {
      setError('Indiquez un numéro de téléphone.');
      return false;
    }
    if (pickupType === 'courier_pickup' && senderAddress.trim().length < 5) {
      setError(
        pickupLocations.length === 0
          ? 'Ajoutez une adresse de collecte dans Paramètres → Entreprise.'
          : 'Adresse de collecte requise pour une Collecte Eveider.',
      );
      return false;
    }
    if (pickupType === 'courier_pickup' && pickupLocations.length > 0 && !pickupLocationId) {
      setError('Choisissez un lieu de collecte.');
      return false;
    }
    setError(null);
    return true;
  }

  function validateRecipient(): boolean {
    if (recipientName.trim().length < 2) {
      setError('Nom destinataire requis.');
      return false;
    }
    if (!recipientPhone.trim()) {
      setError('Téléphone destinataire requis.');
      return false;
    }
    setError(null);
    return true;
  }

  function validateLocker(): boolean {
    if (!lockerId) {
      setError('Sélectionnez un casier Eveider.');
      return false;
    }
    setError(null);
    return true;
  }

  function handleNext() {
    if (stepIndex === 0 && !validateMethod()) return;
    if (stepIndex === 1 && !validateRecipient()) return;
    if (stepIndex === 3 && !validateLocker()) return;
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (!validateMethod() || !validateRecipient() || !validateLocker()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/organisation/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim() || undefined,
          pickupType,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          senderAddress: pickupType === 'courier_pickup' ? senderAddress.trim() : undefined,
          pickupLocationId:
            pickupType === 'courier_pickup' && pickupLocationId ? pickupLocationId : undefined,
          senderLocationName:
            pickupType === 'courier_pickup' ? senderLocationName ?? undefined : undefined,
          senderLat: pickupType === 'courier_pickup' ? senderLat : undefined,
          senderLng: pickupType === 'courier_pickup' ? senderLng : undefined,
          senderInstructions:
            pickupType === 'courier_pickup' ? senderInstructions ?? undefined : undefined,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          lockerId,
          packageSize,
          packageCategory: 'other',
        }),
      });

      const result = await response.json().catch(() => null);
      if (!result?.success) {
        const message = result?.error ?? 'Création échouée';
        setError(message);
        toast.error(message, 'Création impossible');
        setLoading(false);
        return;
      }

      const tracking = result.data.parcel.trackingNumber as string;
      toast.success(`Colis ${tracking} créé.`);
      router.replace(`/organisation/tableau-de-bord/colis/${result.data.parcel.id}?created=1`);
    } catch {
      const message = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '0.35rem',
    height: 42,
    padding: '0 10px',
    border: borderSubtle(),
    borderRadius: 8,
    background: colors.surface,
  };

  const isDropoff = pickupType === 'merchant_dropoff';
  const chargeTitle = isDropoff ? 'Frais de retrait' : 'Frais de livraison';
  const lockerTitle = selectedLocker?.networkLabel ?? selectedLocker?.name ?? '—';
  const nextAction = isDropoff
    ? {
        title: 'Prochaine étape',
        body: `Après création, vous recevrez les instructions de dépôt. Apportez ensuite le colis au casier ${lockerTitle}.`,
      }
    : {
        title: 'Prochaine étape',
        body: 'Après création, Eveider organisera la collecte auprès de votre entreprise. Préparez le colis à l’adresse indiquée.',
      };

  return (
    <Wizard
      steps={STEPS}
      currentStepIndex={stepIndex}
      orientation="vertical"
      onBack={() => {
        setError(null);
        setStepIndex((current) => Math.max(current - 1, 0));
      }}
      onNext={handleNext}
      onSubmit={() => void handleSubmit()}
      loading={loading}
      submitLabel="Créer le colis"
      onStepSelect={(index) => {
        if (index < stepIndex) setStepIndex(index);
      }}
    >
      {error ? (
        <div style={{ marginBottom: '1rem' }}>
          <InlineAlert message={error} variant="error" />
        </div>
      ) : null}

      {stepIndex === 0 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            Comment ce colis entre-t-il dans le réseau Eveider ?
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(['courier_pickup', 'merchant_dropoff'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={loading}
                onClick={() => setPickupType(type)}
                style={{
                  flex: '1 1 240px',
                  padding: '1rem 1.1rem',
                  border: pickupType === type ? `2px solid ${colors.primary}` : borderSubtle(),
                  borderRadius: 8,
                  background: pickupType === type ? colors.primaryMuted : colors.surface,
                  color: colors.secondary,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>{METHOD_COPY[type].title}</strong>
                <span style={{ display: 'block', marginTop: 6, fontSize: '0.8125rem', fontWeight: 500 }}>
                  {METHOD_COPY[type].body}
                </span>
              </button>
            ))}
          </div>

          {pickupType === 'courier_pickup' ? (
            <>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
                Eveider organisera la prise en charge. Vous ne choisissez pas le chauffeur.
              </p>
              {pickupLocations.length === 0 ? (
                <a
                  href={WEB_ROUTES.businessSettingsOrganisation}
                  style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.primary }}
                >
                  + Ajouter une adresse
                </a>
              ) : (
                <>
                  <label className="ops-field">
                    <span className="ops-field-label">Lieu de collecte</span>
                    <select
                      value={pickupLocationId}
                      disabled={loading}
                      onChange={(e) => {
                        const next = pickupLocations.find((location) => location.id === e.target.value);
                        if (next) applyPickupLocation(next, { overrideContact: true });
                      }}
                      style={{
                        width: '100%',
                        height: 44,
                        borderRadius: 8,
                        border: borderSubtle(),
                        padding: '0 0.75rem',
                        background: colors.surface,
                        color: colors.secondary,
                      }}
                    >
                      {pickupLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                          {location.isDefault ? ' (par défaut)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedPickupLocation ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: '0.35rem',
                        padding: '0.85rem 1rem',
                        borderRadius: 8,
                        border: borderSubtle(),
                        background: colors.surface,
                        fontSize: '0.8125rem',
                        color: colors.textMuted,
                      }}
                    >
                      <span>{selectedPickupLocation.street}</span>
                      {selectedPickupLocation.instructions ? (
                        <span>Instructions · {selectedPickupLocation.instructions}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <a
                    href="/organisation/tableau-de-bord/parametres/organisation"
                    style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.primary }}
                  >
                    + Ajouter une adresse
                  </a>
                  <TextField
                    label="Personne à joindre"
                    name="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    disabled={loading}
                    required
                    hint="Quelqu’un présent à cette adresse, que le chauffeur Eveider pourra appeler."
                    placeholder="Jean Mukendi"
                  />
                  <PhoneField
                    label="Téléphone"
                    name="senderPhone"
                    value={senderPhone}
                    onChange={setSenderPhone}
                    disabled={loading}
                    required
                    hint="Numéro joignable au moment de la prise en charge."
                  />
                </>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
                Vous devrez déposer ce colis au casier sélectionné. Aucun chauffeur Eveider n’intervient.
              </p>
              <TextField
                label="Personne à joindre"
                name="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={loading}
                required
                hint="Personne à contacter au sujet de ce colis — pas le nom de l’entreprise."
                placeholder="Jean Mukendi"
              />
              <PhoneField
                label="Téléphone"
                name="senderPhone"
                value={senderPhone}
                onChange={setSenderPhone}
                disabled={loading}
                required
              />
            </>
          )}
        </section>
      ) : null}

      {stepIndex === 1 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <TextField
            label="Nom"
            name="recipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            disabled={loading}
            required
          />
          <PhoneField
            label="Téléphone"
            name="recipientPhone"
            value={recipientPhone}
            onChange={setRecipientPhone}
            disabled={loading}
            required
          />
          <TextField
            label="Email (optionnel)"
            name="recipientEmail"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            disabled={loading}
          />
        </section>
      ) : null}

      {stepIndex === 2 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Taille du colis</span>
            <select
              value={packageSize}
              disabled={loading}
              onChange={(e) => setPackageSize(e.target.value as PackageSize)}
              style={selectStyle}
            >
              {PACKAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {PACKAGE_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
              Sert à trouver un compartiment compatible. Ce n’est pas un facteur de prix.
            </p>
          </label>
          <TextField
            label="Référence interne (optionnel)"
            name="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            placeholder="CMD-2026-001"
          />
        </section>
      ) : null}

      {stepIndex === 3 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8125rem' }}>Casier de destination</p>
          {isDropoff ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
              Vous devrez déposer ce colis au casier sélectionné.
            </p>
          ) : null}
          {selectedLocker ? (
            <div
              style={{
                border: `2px solid ${colors.primary}`,
                borderRadius: 8,
                background: colors.primaryMuted,
                padding: '0.85rem 1rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
                Sélectionné · {selectedLocker.networkLabel ?? selectedLocker.name}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
                {selectedLocker.address}
              </p>
            </div>
          ) : null}
          <LockerPicker lockers={lockers} selectedLockerId={lockerId} onSelectLocker={setLockerId} />
        </section>
      ) : null}

      {stepIndex === 4 ? (
        <section style={{ display: 'grid', gap: '1.25rem' }}>
          <dl
            style={{
              margin: 0,
              border: borderSubtle(),
              borderRadius: 8,
              padding: '1.15rem 1.25rem',
              display: 'grid',
              gap: '1.15rem',
              background: colors.surface,
            }}
          >
            <ReviewRow label="Entrée dans le réseau">{getFulfillmentMethodLabel(pickupType)}</ReviewRow>
            {pickupType === 'courier_pickup' ? (
              <ReviewRow label="Collecte">
                <span style={{ display: 'block' }}>
                  {senderLocationName || selectedPickupLocation?.name || 'Lieu de collecte'}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                  {senderAddress.trim() || '—'}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                  {senderName.trim()} · {senderPhone.trim()}
                </span>
              </ReviewRow>
            ) : null}

            <ReviewRow label="Destinataire">
              <span style={{ display: 'block' }}>{recipientName.trim() || '—'}</span>
              <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                {recipientPhone.trim() || '—'}
              </span>
              {recipientEmail.trim() ? (
                <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                  {recipientEmail.trim()}
                </span>
              ) : null}
            </ReviewRow>

            <ReviewRow label="Colis">
              <span style={{ display: 'block' }}>{PACKAGE_SIZE_LABELS[packageSize]}</span>
              {reference.trim() ? (
                <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                  Réf. {reference.trim()}
                </span>
              ) : null}
            </ReviewRow>

            <ReviewRow label="Casier">
              <span style={{ display: 'block' }}>{lockerTitle}</span>
              {selectedLocker?.address ? (
                <span style={{ display: 'block', marginTop: 2, fontWeight: 500, color: colors.textMuted }}>
                  {selectedLocker.address}
                </span>
              ) : null}
            </ReviewRow>

            <div
              style={{
                borderTop: borderSubtle(),
                paddingTop: '1rem',
                display: 'grid',
                gap: '0.55rem',
                fontSize: '0.875rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 500, color: colors.textMuted }}>{chargeTitle}</span>
                <span style={{ fontWeight: 700, color: colors.secondary }}>
                  {deliveryQuoteLabel ?? 'Tarif indisponible'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 500, color: colors.textMuted }}>Payé par</span>
                <span style={{ fontWeight: 600, color: colors.secondary }}>Destinataire</span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
                Votre entreprise ne paie aucun frais pour {isDropoff ? 'ce retrait' : 'cette livraison'}.
              </p>
            </div>
          </dl>

          <div
            style={{
              border: borderSubtle(),
              borderRadius: 8,
              padding: '1rem 1.15rem',
              background: colors.primaryMuted,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: colors.successFg,
              }}
            >
              {nextAction.title}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.45 }}>
              {nextAction.body}
            </p>
          </div>
        </section>
      ) : null}
    </Wizard>
  );
}
