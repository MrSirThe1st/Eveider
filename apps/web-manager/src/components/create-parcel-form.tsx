'use client';

import { colors, spacing, typography, borderSubtle } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import { Button, InlineAlert, TextField, Wizard, type WizardStep, useToast } from '@eveider/ui';
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
    id: 'recipient',
    title: 'Destinataire',
    description: 'Identifiez le client qui retirera le colis.',
  },
  {
    id: 'locker',
    title: 'Point de retrait',
    description:
      'Choisissez un point Eveider, ou laissez le client choisir dans l’app.',
  },
  {
    id: 'review',
    title: 'Revue',
    description: 'Vérifiez les informations avant de créer le colis.',
  },
];

type LockerCompartmentsResponse = {
  locker: { id: string; name: string; address: string; rows: number; columns: number };
  compartments: SelectableCompartment[];
};

type FieldErrors = {
  recipientPhone?: string;
  compartmentId?: string;
};

export function CreateParcelForm() {
  const router = useRouter();
  const toast = useToast();
  const [stepIndex, setStepIndex] = useState(0);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{
    deepLink: string;
    webLink: string;
  } | null>(null);

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

  const availableCount = useMemo(
    () => compartmentData?.compartments.filter((c) => c.selectable).length ?? 0,
    [compartmentData],
  );

  const formLocked = loading || !!success;

  function handleSelectLocker(id: string) {
    setLockerId(id);
    setCompartmentId('');
    setError(null);
    setFieldErrors((current) => ({ ...current, compartmentId: undefined }));
  }

  function handleClearLocker() {
    setLockerId('');
    setCompartmentId('');
    setCompartmentData(null);
    setFieldErrors((current) => ({ ...current, compartmentId: undefined }));
  }

  function validateRecipient(): boolean {
    const phone = recipientPhone.trim();
    if (!phone) {
      setFieldErrors({ recipientPhone: 'Le téléphone destinataire est obligatoire.' });
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function validateLocker(): boolean {
    if (lockerId && needsCompartment && !compartmentId) {
      setFieldErrors({
        compartmentId: 'Sélectionnez un compartiment pour le casier choisi.',
      });
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function handleNext() {
    setError(null);
    if (stepIndex === 0 && !validateRecipient()) return;
    if (stepIndex === 1 && !validateLocker()) return;
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function handleBack() {
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    if (!validateRecipient()) {
      setStepIndex(0);
      return;
    }
    if (!validateLocker()) {
      setStepIndex(1);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/entreprise/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim() || undefined,
          recipientName: recipientName.trim() || undefined,
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          lockerId: lockerId || undefined,
          compartmentId: compartmentId || undefined,
        }),
      });

      let result: {
        success: boolean;
        data?: {
          parcel: { id: string; trackingNumber: string; reference: string | null };
          recipientStatus: 'existing_user' | 'invited';
          invite: { deepLink: string; webLink: string } | null;
        };
        error?: string;
      };
      try {
        result = await response.json();
      } catch {
        setError('Réponse serveur invalide. Redémarrez le serveur de dev.');
        toast.error('Réponse serveur invalide. Redémarrez le serveur de dev.');
        setLoading(false);
        return;
      }

      if (!result.success) {
        const message = result.error ?? 'Création échouée';
        setError(message);
        toast.error(message, 'Création impossible');
        setLoading(false);
        return;
      }

      router.refresh();

      const tracking = result.data!.parcel.trackingNumber;
      if (result.data!.recipientStatus === 'invited' && result.data!.invite) {
        setCreatedInvite(result.data!.invite);
        setSuccess(
          `Colis ${tracking} créé. Invitation générée — le destinataire n'a pas encore de compte Eveider.`,
        );
        toast.success(`Colis ${tracking} créé — invitation destinataire générée.`);
      } else {
        setSuccess(`Colis ${tracking} créé avec succès. Redirection…`);
        toast.success(`Colis ${tracking} créé avec succès.`);
      }
      setLoading(false);

      window.setTimeout(() => {
        router.replace(`/entreprise/tableau-de-bord/colis/${result.data!.parcel.id}?created=1`);
      }, result.data!.recipientStatus === 'invited' ? 4500 : 900);
    } catch {
      const message = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  }

  const reviewRows = [
    { label: 'Référence', value: reference.trim() || '—' },
    { label: 'Destinataire', value: recipientName.trim() || '—' },
    { label: 'Téléphone', value: recipientPhone.trim() },
    { label: 'Email', value: recipientEmail.trim() || '—' },
    {
      label: 'Point',
      value: selectedLocker
        ? selectedLocker.name
        : 'Non assigné (choix client dans l’app)',
    },
    {
      label: 'Compartiment',
      value: needsCompartment
        ? compartmentId
          ? compartmentData?.compartments.find((c) => c.id === compartmentId)?.label ??
            compartmentId
          : '—'
        : 'Non applicable',
    },
  ];

  return (
    <div>
      {success ? <InlineAlert message={success} variant="success" /> : null}
      {createdInvite ? (
        <div
          className="nb-card"
          style={{
            marginBottom: spacing[5],
            padding: spacing[4],
            fontSize: typography.bodySm.fontSize,
          }}
        >
          <p style={{ margin: `0 0 ${spacing[2]}px`, fontWeight: typography.weights.semibold }}>
            Lien d&apos;invitation (simulation)
          </p>
          <p style={{ margin: `0 0 ${spacing[1]}px`, wordBreak: 'break-all' }}>
            <strong>Web :</strong> {createdInvite.webLink}
          </p>
          <p style={{ margin: 0, wordBreak: 'break-all' }}>
            <strong>App :</strong> {createdInvite.deepLink}
          </p>
        </div>
      ) : null}
      {error ? (
        <InlineAlert message={error} variant="error" onDismiss={() => setError(null)} />
      ) : null}

      <Wizard
        steps={STEPS}
        currentStepIndex={stepIndex}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={() => void handleSubmit()}
        onStepSelect={(index) => {
          if (index < stepIndex) setStepIndex(index);
        }}
        loading={loading}
        nextDisabled={formLocked && !loading}
        submitLabel={loading ? 'Création…' : success ? 'Colis créé' : 'Créer le colis'}
      >
        {stepIndex === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>
            <TextField
              label="Référence marchande (optionnel)"
              name="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="CMD-2026-001"
              disabled={formLocked}
              hint="Un numéro de suivi Eveider (EVD…) sera généré automatiquement."
            />
            <TextField
              label="Nom destinataire"
              name="recipientName"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Jean Mukendi"
              disabled={formLocked}
            />
            <TextField
              label="Téléphone destinataire"
              name="recipientPhone"
              type="tel"
              value={recipientPhone}
              onChange={(e) => {
                setRecipientPhone(e.target.value);
                setFieldErrors((current) => ({ ...current, recipientPhone: undefined }));
              }}
              placeholder="+243800000000"
              required
              disabled={formLocked}
              error={fieldErrors.recipientPhone}
            />
            <TextField
              label="Email destinataire (optionnel)"
              name="recipientEmail"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@exemple.cd"
              disabled={formLocked}
            />
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: spacing[4],
              }}
            >
              {lockerId ? (
                <Button variant="secondary" size="sm" onClick={handleClearLocker} disabled={formLocked}>
                  Effacer la sélection
                </Button>
              ) : null}
            </div>

            {lockers.length === 0 ? (
              <p style={{ margin: 0, fontSize: typography.bodySm.fontSize, fontWeight: 500 }}>
                Aucun point en base. Exécutez <code>pnpm db:seed</code> puis rechargez la page.
              </p>
            ) : (
              <LockerPicker
                lockers={lockers}
                selectedLockerId={lockerId}
                onSelectLocker={handleSelectLocker}
              />
            )}

            {fieldErrors.compartmentId ? (
              <p
                role="alert"
                style={{
                  margin: `${spacing[4]}px 0 0`,
                  color: colors.danger,
                  fontSize: typography.caption.fontSize,
                  fontWeight: typography.weights.semibold,
                }}
              >
                {fieldErrors.compartmentId}
              </p>
            ) : null}

            {lockerId && needsCompartment ? (
              <div
                style={{
                  marginTop: spacing[7],
                  paddingTop: spacing[6],
                  borderTop: borderSubtle(),
                }}
              >
                <p
                  style={{
                    margin: `0 0 ${spacing[1]}px`,
                    fontWeight: typography.weights.bold,
                    fontSize: typography.bodySm.fontSize,
                  }}
                >
                  {selectedLocker?.name ?? compartmentData?.locker.name}
                </p>
                <p
                  style={{
                    margin: `0 0 ${spacing[4]}px`,
                    fontSize: typography.bodySm.fontSize,
                    color: colors.textMuted,
                  }}
                >
                  {loadingCompartments
                    ? 'Chargement des compartiments…'
                    : `${availableCount} compartiment${availableCount > 1 ? 's' : ''} disponible${availableCount > 1 ? 's' : ''} — cliquez pour réserver`}
                </p>

                {loadingCompartments ? null : compartmentData ? (
                  <>
                    <CompartmentSelectGrid
                      rows={compartmentData.locker.rows}
                      columns={compartmentData.locker.columns}
                      compartments={compartmentData.compartments}
                      selectedId={compartmentId}
                      onSelect={(id) => {
                        setCompartmentId(id);
                        setFieldErrors((current) => ({ ...current, compartmentId: undefined }));
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: spacing[4],
                        marginTop: spacing[4],
                        fontSize: typography.caption.fontSize,
                        fontWeight: typography.weights.semibold,
                        color: colors.textMuted,
                      }}
                    >
                      <span>■ Disponible</span>
                      <span>■ Réservé</span>
                      <span>■ Occupé</span>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: typography.bodySm.fontSize, color: colors.danger }}>
                    {compartmentError ?? 'Impossible d’afficher la grille de ce casier.'}
                  </p>
                )}
              </div>
            ) : null}

            {lockerId && selectedLocker && !needsCompartment ? (
              <p
                style={{
                  margin: `${spacing[5]}px 0 0`,
                  fontSize: typography.bodySm.fontSize,
                  fontWeight: 500,
                }}
              >
                Point sélectionné — {selectedLocker.availableSlots ?? selectedLocker.availableCompartments}{' '}
                place(s) libre(s). Pas de compartiment à choisir.
              </p>
            ) : null}
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div>
            <dl
              style={{
                margin: 0,
                display: 'grid',
                gap: spacing[3],
              }}
            >
              {reviewRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 160px) 1fr',
                    gap: spacing[3],
                    paddingBottom: spacing[3],
                    borderBottom: borderSubtle(),
                  }}
                >
                  <dt
                    style={{
                      margin: 0,
                      fontSize: typography.bodySm.fontSize,
                      fontWeight: typography.weights.semibold,
                      color: colors.textMuted,
                    }}
                  >
                    {row.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: typography.bodySm.fontSize,
                      fontWeight: typography.weights.semibold,
                      color: colors.secondary,
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Wizard>
    </div>
  );
}
