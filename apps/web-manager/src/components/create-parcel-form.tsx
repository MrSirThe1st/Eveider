'use client';

import { colors, borderSubtle } from '@eveider/config-ui';
import { PACKAGE_SIZE_LABELS, PACKAGE_SIZES, type PackageSize, type ShipmentPickupType } from '@eveider/domain';
import { InlineAlert, TextField, Wizard, type WizardStep, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LockerPicker } from '@/components/locker-picker';
import type { LockerOption } from '@/components/locker-card';
import { getFulfillmentMethodLabel } from '@/lib/business-presentation';

const STEPS: WizardStep[] = [
  { id: 'method', title: 'Méthode', description: 'Comment le colis entre dans le réseau Eveider.' },
  { id: 'recipient', title: 'Destinataire', description: 'Qui retirera le colis.' },
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

export function CreateParcelForm({ initialLockerId }: CreateParcelFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [stepIndex, setStepIndex] = useState(0);

  const [pickupType, setPickupType] = useState<ShipmentPickupType>('courier_pickup');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

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
  const [quoteChargeLabel, setQuoteChargeLabel] = useState<string | null>(null);

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
        };
        if (data.senderName) setSenderName(data.senderName);
        if (data.senderPhone) setSenderPhone(data.senderPhone);
        if (data.senderAddress) setSenderAddress(data.senderAddress);
        if (data.dropoffLockerId && UUID_RE.test(data.dropoffLockerId)) {
          setLockerId((current) => current || data.dropoffLockerId!);
        }
      })
      .catch(() => {
        /* prefill optional */
      });
  }, []);

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
      setQuoteChargeLabel(null);
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
          setDeliveryQuoteLabel(json.data.deliveryFeeLabel as string);
          setQuoteChargeLabel((json.data.purpose as string | undefined) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryQuoteLabel(null);
          setQuoteChargeLabel(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lockerId, packageSize, pickupType, senderAddress]);

  function validateMethod(): boolean {
    if (senderName.trim().length < 2) {
      setError('Nom de l’entreprise / contact requis.');
      return false;
    }
    if (!senderPhone.trim()) {
      setError('Téléphone de contact requis.');
      return false;
    }
    if (pickupType === 'courier_pickup' && senderAddress.trim().length < 5) {
      setError('Adresse de collecte requise pour une Collecte Eveider.');
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

  const chargeTitle =
    pickupType === 'merchant_dropoff' ? 'Frais de retrait' : 'Frais de livraison';

  return (
    <Wizard
      steps={STEPS}
      currentStepIndex={stepIndex}
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
              <TextField
                label="Contact collecte"
                name="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={loading}
                required
              />
              <TextField
                label="Téléphone de collecte"
                name="senderPhone"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                disabled={loading}
                required
              />
              <TextField
                label="Adresse de collecte"
                name="senderAddress"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                disabled={loading}
                required
                placeholder="Rue, quartier, ville…"
              />
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
                Vous devrez déposer ce colis au casier sélectionné. Aucun chauffeur Eveider n’intervient.
              </p>
              <TextField
                label="Contact entreprise"
                name="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={loading}
                required
              />
              <TextField
                label="Téléphone entreprise"
                name="senderPhone"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
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
            label="Nom destinataire"
            name="recipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            disabled={loading}
            required
          />
          <TextField
            label="Téléphone destinataire"
            name="recipientPhone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            disabled={loading}
            required
          />
          <TextField
            label="Email destinataire (optionnel)"
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
          {pickupType === 'merchant_dropoff' ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
              Vous devrez déposer ce colis au casier sélectionné.
            </p>
          ) : null}
          {selectedLocker ? (
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              {selectedLocker.networkLabel ?? selectedLocker.name}
              <span style={{ display: 'block', fontWeight: 500, color: colors.textMuted, marginTop: 2 }}>
                {selectedLocker.address}
              </span>
            </p>
          ) : null}
          <LockerPicker lockers={lockers} selectedLockerId={lockerId} onSelectLocker={setLockerId} />
        </section>
      ) : null}

      {stepIndex === 4 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              border: borderSubtle(),
              borderRadius: 8,
              padding: '1rem',
              display: 'grid',
              gap: '0.4rem',
              fontSize: '0.875rem',
            }}
          >
            <strong>Revue</strong>
            <span>Méthode : {getFulfillmentMethodLabel(pickupType)}</span>
            <span>
              Destinataire : {recipientName} · {recipientPhone}
            </span>
            <span>Casier : {selectedLocker?.networkLabel ?? selectedLocker?.name ?? '—'}</span>
            <span>
              {chargeTitle} : {deliveryQuoteLabel ?? 'Tarif indisponible'}
            </span>
            <span>Payé par : Destinataire</span>
            {quoteChargeLabel ? (
              <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>{quoteChargeLabel}</span>
            ) : null}
            <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
              {pickupType === 'courier_pickup'
                ? 'Eveider organisera la prise en charge du colis. Votre entreprise ne paie pas ce frais.'
                : 'Après création, déposez le colis au casier. Votre entreprise ne paie pas ce frais.'}
            </span>
          </div>
        </section>
      ) : null}
    </Wizard>
  );
}
