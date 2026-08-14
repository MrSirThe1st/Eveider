'use client';

import { colors, borderSubtle } from '@eveider/config-ui';
import {
  isCodAllowedForLockerType,
  PACKAGE_CATEGORIES,
  PACKAGE_CATEGORY_LABELS,
  PACKAGE_SIZE_LABELS,
  PACKAGE_SIZES,
  PAYMENT_RESPONSIBILITIES,
  PAYMENT_RESPONSIBILITY_LABELS,
  SHIPMENT_PICKUP_TYPE_LABELS,
  suggestPackageSizeFromDimensions,
  usesCompartmentGrid,
  type PackageCategory,
  type PackageSize,
  type PaymentResponsibility,
  type ShipmentPickupType,
} from '@eveider/domain';
import { InlineAlert, TextField, Wizard, type WizardStep, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CompartmentSelectGrid,
  type SelectableCompartment,
} from '@/components/compartment-select-grid';
import { LockerPicker } from '@/components/locker-picker';
import type { LockerOption } from '@/components/locker-card';

const STEPS: WizardStep[] = [
  {
    id: 'pickup',
    title: 'Enlèvement',
    description: 'Mode d’enlèvement et coordonnées de l’expéditeur.',
  },
  {
    id: 'recipient',
    title: 'Destinataire',
    description: 'Client qui retirera l’envoi.',
  },
  {
    id: 'package',
    title: 'Point & colis',
    description: 'Point Eveider et caractéristiques du colis.',
  },
  {
    id: 'payment',
    title: 'Paiement',
    description: 'Qui paie, puis revue avant création.',
  },
];

type LockerCompartmentsResponse = {
  locker: { id: string; name: string; address: string; rows: number; columns: number };
  compartments: SelectableCompartment[];
};

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function CreateParcelForm() {
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

  const [lockerId, setLockerId] = useState('');
  const [compartmentId, setCompartmentId] = useState('');
  const [lockers, setLockers] = useState<LockerOption[]>([]);
  const [compartmentData, setCompartmentData] = useState<LockerCompartmentsResponse | null>(null);
  const [compartmentError, setCompartmentError] = useState<string | null>(null);
  const [loadingCompartments, setLoadingCompartments] = useState(false);

  const [packageSize, setPackageSize] = useState<PackageSize>('medium');
  const [sizeManuallySet, setSizeManuallySet] = useState(false);
  const [deliveryQuoteLabel, setDeliveryQuoteLabel] = useState<string | null>(null);
  const [packageCategory, setPackageCategory] = useState<PackageCategory>('other');
  const [packageLengthCm, setPackageLengthCm] = useState('');
  const [packageWidthCm, setPackageWidthCm] = useState('');
  const [packageHeightCm, setPackageHeightCm] = useState('');
  const [packageWeightKg, setPackageWeightKg] = useState('');
  const [declaredValueCdf, setDeclaredValueCdf] = useState('');
  const [declaredValueUsd, setDeclaredValueUsd] = useState('');

  const [paymentResponsibility, setPaymentResponsibility] =
    useState<PaymentResponsibility>('receiver_pays');
  const [codAmountCdf, setCodAmountCdf] = useState('');
  const [codAmountUsd, setCodAmountUsd] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/entreprise/shipment-prefill')
      .then((res) => res.json())
      .then((result) => {
        if (!result.success) return;
        const data = result.data as {
          senderName?: string;
          senderPhone?: string;
          senderAddress?: string | null;
          pickupType?: ShipmentPickupType;
        };
        if (data.senderName) setSenderName(data.senderName);
        if (data.senderPhone) setSenderPhone(data.senderPhone);
        if (data.senderAddress) setSenderAddress(data.senderAddress);
        if (data.pickupType) setPickupType(data.pickupType);
      })
      .catch(() => {
        /* prefill optional */
      });
  }, []);

  useEffect(() => {
    async function loadLockers(lat?: number, lng?: number) {
      const path =
        lat != null && lng != null
          ? `/api/lockers/nearest?latitude=${lat}&longitude=${lng}&limit=20`
          : '/api/entreprise/lockers';

      try {
        const response = await fetch(path);
        const result = await response.json();
        if (result.success) {
          setLockers(result.data.lockers as LockerOption[]);
        }
      } catch {
        /* lockers optional */
      }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void loadLockers(position.coords.latitude, position.coords.longitude);
        },
        () => {
          void loadLockers();
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
      return;
    }

    void loadLockers();
  }, []);

  useEffect(() => {
    if (!lockerId) {
      setCompartmentData(null);
      setCompartmentId('');
      setCompartmentError(null);
      return;
    }

    const selected = lockers.find((locker) => locker.id === lockerId);
    if (selected && !usesCompartmentGrid(selected.type ?? 'SMART_LOCKER')) {
      setCompartmentData(null);
      setCompartmentId('');
      setCompartmentError(null);
      setLoadingCompartments(false);
      return;
    }

    let cancelled = false;
    setLoadingCompartments(true);
    setCompartmentId('');
    setCompartmentError(null);

    void fetch(`/api/entreprise/lockers/${lockerId}/compartments`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setCompartmentData(result.data);
          setCompartmentError(null);
        } else {
          setCompartmentData(null);
          setCompartmentError(result.error ?? 'Impossible de charger les compartiments');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompartmentData(null);
          setCompartmentError('Erreur réseau lors du chargement des compartiments');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCompartments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lockerId, lockers]);

  const selectedLocker = useMemo(
    () => lockers.find((locker) => locker.id === lockerId) ?? null,
    [lockers, lockerId],
  );

  const needsCompartment = selectedLocker
    ? usesCompartmentGrid(selectedLocker.type ?? 'SMART_LOCKER')
    : false;

  const codAllowed = selectedLocker
    ? isCodAllowedForLockerType(selectedLocker.type ?? 'SMART_LOCKER')
    : true;

  useEffect(() => {
    if (!codAllowed && paymentResponsibility === 'cod') {
      setPaymentResponsibility('receiver_pays');
    }
  }, [codAllowed, paymentResponsibility]);

  useEffect(() => {
    const suggested = suggestPackageSizeFromDimensions({
      lengthCm: optionalNumber(packageLengthCm),
      widthCm: optionalNumber(packageWidthCm),
      heightCm: optionalNumber(packageHeightCm),
    });
    if (suggested && !sizeManuallySet) {
      setPackageSize(suggested);
    }
  }, [packageLengthCm, packageWidthCm, packageHeightCm, sizeManuallySet]);

  useEffect(() => {
    if (!lockerId) {
      setDeliveryQuoteLabel(null);
      return;
    }
    const params = new URLSearchParams({ lockerId, packageSize });
    if (compartmentId) params.set('compartmentId', compartmentId);
    if (senderAddress.trim()) params.set('senderAddress', senderAddress.trim());

    let cancelled = false;
    void fetch(`/api/entreprise/delivery-quote?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setDeliveryQuoteLabel(json.data.deliveryFeeLabel as string);
        }
      })
      .catch(() => {
        if (!cancelled) setDeliveryQuoteLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [compartmentId, lockerId, packageSize, senderAddress]);

  function validatePickup(): boolean {
    if (senderName.trim().length < 2) {
      setError('Nom expéditeur requis.');
      return false;
    }
    if (!senderPhone.trim()) {
      setError('Téléphone expéditeur requis.');
      return false;
    }
    if (pickupType === 'courier_pickup' && senderAddress.trim().length < 5) {
      setError('Adresse expéditeur requise pour un enlèvement coursier.');
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

  function validatePackage(): boolean {
    if (!lockerId) {
      setError('Sélectionnez un point de retrait.');
      return false;
    }
    if (needsCompartment && !compartmentId) {
      setError('Sélectionnez un compartiment pour le casier choisi.');
      return false;
    }
    setError(null);
    return true;
  }

  function validatePayment(): boolean {
    if (paymentResponsibility === 'cod') {
      if (!codAllowed) {
        setError('Le COD n’est pas disponible pour les casiers intelligents.');
        return false;
      }
      if (!optionalNumber(codAmountCdf) && !optionalNumber(codAmountUsd)) {
        setError('Indiquez un montant COD (CDF ou USD).');
        return false;
      }
    }
    setError(null);
    return true;
  }

  function handleNext() {
    if (stepIndex === 0 && !validatePickup()) return;
    if (stepIndex === 1 && !validateRecipient()) return;
    if (stepIndex === 2 && !validatePackage()) return;
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (!validatePickup() || !validateRecipient() || !validatePackage() || !validatePayment()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/entreprise/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim() || undefined,
          pickupType,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          senderAddress:
            pickupType === 'courier_pickup' ? senderAddress.trim() : undefined,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          lockerId,
          compartmentId: compartmentId || undefined,
          packageSize,
          packageCategory,
          packageLengthCm: optionalNumber(packageLengthCm),
          packageWidthCm: optionalNumber(packageWidthCm),
          packageHeightCm: optionalNumber(packageHeightCm),
          packageWeightKg: optionalNumber(packageWeightKg),
          declaredValueCdf: optionalNumber(declaredValueCdf),
          declaredValueUsd: optionalNumber(declaredValueUsd),
          paymentResponsibility,
          codAmountCdf:
            paymentResponsibility === 'cod' ? optionalNumber(codAmountCdf) : undefined,
          codAmountUsd:
            paymentResponsibility === 'cod' ? optionalNumber(codAmountUsd) : undefined,
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
      toast.success(`Envoi ${tracking} créé.`);
      router.refresh();
      router.replace(`/entreprise/tableau-de-bord/colis/${result.data.parcel.id}?created=1`);
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
      submitLabel="Créer l’envoi"
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['courier_pickup', 'merchant_dropoff'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={loading}
                onClick={() => setPickupType(type)}
                style={{
                  flex: '1 1 200px',
                  padding: '0.875rem 1rem',
                  border:
                    pickupType === type ? `2px solid ${colors.primary}` : borderSubtle(),
                  borderRadius: 8,
                  background: pickupType === type ? '#F0FDF4' : colors.surface,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {SHIPMENT_PICKUP_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <TextField
            label="Nom expéditeur"
            name="senderName"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            disabled={loading}
            required
          />
          <TextField
            label="Téléphone expéditeur"
            name="senderPhone"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            disabled={loading}
            required
          />
          {pickupType === 'courier_pickup' ? (
            <TextField
              label="Adresse d’enlèvement"
              name="senderAddress"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              disabled={loading}
              required
              placeholder="Rue, quartier, ville…"
            />
          ) : (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
              Dépôt au point : l’adresse expéditeur n’est pas requise.
            </p>
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
          <TextField
            label="Référence marchande (optionnel)"
            name="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            placeholder="CMD-2026-001"
          />
        </section>
      ) : null}

      {stepIndex === 2 ? (
        <section style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.8125rem' }}>
              Point de retrait (obligatoire)
            </p>
            <LockerPicker
              lockers={lockers}
              selectedLockerId={lockerId}
              onSelectLocker={setLockerId}
            />
          </div>

          {needsCompartment ? (
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.8125rem' }}>
                Compartiment
              </p>
              {loadingCompartments ? (
                <p style={{ color: colors.textMuted }}>Chargement…</p>
              ) : compartmentError ? (
                <InlineAlert message={compartmentError} variant="error" />
              ) : compartmentData ? (
                <CompartmentSelectGrid
                  rows={compartmentData.locker.rows}
                  columns={compartmentData.locker.columns}
                  compartments={compartmentData.compartments}
                  selectedId={compartmentId || null}
                  onSelect={setCompartmentId}
                />
              ) : null}
            </div>
          ) : null}

          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Taille</span>
            <select
              value={packageSize}
              disabled={loading}
              onChange={(e) => {
                setSizeManuallySet(true);
                setPackageSize(e.target.value as PackageSize);
              }}
              style={selectStyle}
            >
              {PACKAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {PACKAGE_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
            {suggestPackageSizeFromDimensions({
              lengthCm: optionalNumber(packageLengthCm),
              widthCm: optionalNumber(packageWidthCm),
              heightCm: optionalNumber(packageHeightCm),
            }) ? (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
                Suggestion automatique selon les dimensions — vous pouvez modifier la taille.
              </p>
            ) : null}
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Catégorie</span>
            <select
              value={packageCategory}
              disabled={loading}
              onChange={(e) => setPackageCategory(e.target.value as PackageCategory)}
              style={selectStyle}
            >
              {PACKAGE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {PACKAGE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <TextField
              label="Longueur cm"
              name="packageLengthCm"
              value={packageLengthCm}
              onChange={(e) => setPackageLengthCm(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Largeur cm"
              name="packageWidthCm"
              value={packageWidthCm}
              onChange={(e) => setPackageWidthCm(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Hauteur cm"
              name="packageHeightCm"
              value={packageHeightCm}
              onChange={(e) => setPackageHeightCm(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Poids kg"
              name="packageWeightKg"
              value={packageWeightKg}
              onChange={(e) => setPackageWeightKg(e.target.value)}
              disabled={loading}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <TextField
              label="Valeur déclarée (CDF)"
              name="declaredValueCdf"
              value={declaredValueCdf}
              onChange={(e) => setDeclaredValueCdf(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Valeur déclarée (USD)"
              name="declaredValueUsd"
              value={declaredValueUsd}
              onChange={(e) => setDeclaredValueUsd(e.target.value)}
              disabled={loading}
            />
          </div>
        </section>
      ) : null}

      {stepIndex === 3 ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {PAYMENT_RESPONSIBILITIES.map((mode) => {
              const disabledMode = loading || (mode === 'cod' && !codAllowed);
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabledMode}
                  onClick={() => setPaymentResponsibility(mode)}
                  style={{
                    textAlign: 'left',
                    padding: '0.875rem 1rem',
                    border:
                      paymentResponsibility === mode
                        ? `2px solid ${colors.primary}`
                        : borderSubtle(),
                    borderRadius: 8,
                    background:
                      paymentResponsibility === mode ? '#F0FDF4' : colors.surface,
                    opacity: mode === 'cod' && !codAllowed ? 0.5 : 1,
                    cursor: disabledMode ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {PAYMENT_RESPONSIBILITY_LABELS[mode]}
                  {mode === 'cod' && !codAllowed ? ' — indisponible (casier intelligent)' : ''}
                </button>
              );
            })}
          </div>

          {paymentResponsibility === 'cod' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <TextField
                label="Montant COD (CDF)"
                name="codAmountCdf"
                value={codAmountCdf}
                onChange={(e) => setCodAmountCdf(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Montant COD (USD)"
                name="codAmountUsd"
                value={codAmountUsd}
                onChange={(e) => setCodAmountUsd(e.target.value)}
                disabled={loading}
              />
            </div>
          ) : null}

          <div
            style={{
              border: borderSubtle(),
              borderRadius: 8,
              padding: '1rem',
              display: 'grid',
              gap: '0.35rem',
              fontSize: '0.875rem',
            }}
          >
            <strong>Revue</strong>
            <span>
              Enlèvement : {SHIPMENT_PICKUP_TYPE_LABELS[pickupType]} · {senderName}
            </span>
            <span>
              Destinataire : {recipientName} · {recipientPhone}
            </span>
            <span>Point : {selectedLocker?.name ?? '—'}</span>
            <span>
              Colis : {PACKAGE_SIZE_LABELS[packageSize]} ·{' '}
              {PACKAGE_CATEGORY_LABELS[packageCategory]}
            </span>
            <span>Paiement : {PAYMENT_RESPONSIBILITY_LABELS[paymentResponsibility]}</span>
            {deliveryQuoteLabel ? (
              <span>Frais de livraison (estimés, verrouillés à la création) : {deliveryQuoteLabel}</span>
            ) : null}
            <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
              Les frais de retrait client (pickup) restent distincts et s’appliquent au destinataire si
              « Destinataire paie ».
            </span>
          </div>
        </section>
      ) : null}
    </Wizard>
  );
}
