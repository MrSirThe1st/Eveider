'use client';

import {
  colors,
  spacing,
  borderSubtle,
  webCardStyle,
  webInputStyle,
  webPrimaryButtonStyle,
  webSecondaryButtonStyle,
} from '@eveider/config-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CompartmentSelectGrid,
  type SelectableCompartment,
} from '@/components/compartment-select-grid';
import { FlashBanner } from '@/components/flash-banner';
import { LockerPicker } from '@/components/locker-picker';
import type { LockerOption } from '@/components/locker-card';

const inputStyle: React.CSSProperties = webInputStyle;

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.875rem',
  color: colors.secondary,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '1.125rem',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: colors.secondary,
};

type LockerCompartmentsResponse = {
  locker: { id: string; name: string; address: string; rows: number; columns: number };
  compartments: SelectableCompartment[];
};

export function CreateParcelForm() {
  const router = useRouter();
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
          setLockers(result.data.lockers);
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
  }, [lockerId]);

  const selectedLocker = useMemo(
    () => lockers.find((locker) => locker.id === lockerId) ?? null,
    [lockers, lockerId],
  );

  const availableCount = useMemo(
    () => compartmentData?.compartments.filter((c) => c.selectable).length ?? 0,
    [compartmentData],
  );

  function handleSelectLocker(id: string) {
    setLockerId(id);
    setCompartmentId('');
    setError(null);
  }

  function handleClearLocker() {
    setLockerId('');
    setCompartmentId('');
    setCompartmentData(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (lockerId && !compartmentId) {
      setError('Sélectionnez un compartiment pour le casier choisi.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/entreprise/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim(),
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
          parcel: { id: string };
          recipientStatus: 'existing_user' | 'invited';
          invite: { deepLink: string; webLink: string } | null;
        };
        error?: string;
      };
      try {
        result = await response.json();
      } catch {
        setError('Réponse serveur invalide. Redémarrez le serveur de dev.');
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(result.error ?? 'Création échouée');
        setLoading(false);
        return;
      }

      router.refresh();

      const parcelRef = reference.trim();
      if (result.data!.recipientStatus === 'invited' && result.data!.invite) {
        setCreatedInvite(result.data!.invite);
        setSuccess(
          `Colis ${parcelRef} créé. Invitation générée — le destinataire n'a pas encore de compte Eveider.`,
        );
      } else {
        setSuccess(`Colis ${parcelRef} créé avec succès. Redirection…`);
      }
      setLoading(false);

      window.setTimeout(() => {
        router.replace(`/entreprise/tableau-de-bord/colis/${result.data!.parcel.id}?created=1`);
      }, result.data!.recipientStatus === 'invited' ? 4500 : 900);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      setLoading(false);
    }
  }

  return (
    <form
      method="post"
      action="/entreprise/tableau-de-bord/colis/nouveau"
      onSubmit={(event) => void handleSubmit(event)}
      style={{ maxWidth: 960 }}
    >
      {success ? <FlashBanner message={success} /> : null}
      {createdInvite ? (
        <div
          style={{
            ...webCardStyle,
            marginBottom: '1.25rem',
            padding: '1rem',
            fontSize: '0.8125rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Lien d&apos;invitation (simulation)</p>
          <p style={{ margin: '0 0 0.35rem', wordBreak: 'break-all' }}>
            <strong>Web :</strong> {createdInvite.webLink}
          </p>
          <p style={{ margin: 0, wordBreak: 'break-all' }}>
            <strong>App :</strong> {createdInvite.deepLink}
          </p>
        </div>
      ) : null}
      {error ? <FlashBanner message={error} variant="error" onDismiss={() => setError(null)} /> : null}

      <section
        style={{
          ...webCardStyle,
          padding: '2rem',
          marginBottom: '1.25rem',
        }}
      >
        <h2 style={sectionTitleStyle}>Destinataire</h2>

        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Référence / n° commande</span>
          <input
            type="text"
            name="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="CMD-2026-001"
            required
            disabled={loading || !!success}
            style={{ ...inputStyle, marginTop: '0.5rem' }}
          />
        </label>

        <label style={{ display: 'block', marginTop: '1.25rem' }}>
          <span style={labelStyle}>Nom destinataire</span>
          <input
            type="text"
            name="recipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Jean Mukendi"
            disabled={loading || !!success}
            style={{ ...inputStyle, marginTop: '0.5rem' }}
          />
        </label>

        <label style={{ display: 'block', marginTop: '1.25rem' }}>
          <span style={labelStyle}>Téléphone destinataire</span>
          <input
            type="tel"
            name="recipientPhone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="+243800000000"
            required
            disabled={loading || !!success}
            style={{ ...inputStyle, marginTop: '0.5rem' }}
          />
        </label>

        <label style={{ display: 'block', marginTop: '1.25rem' }}>
          <span style={labelStyle}>Email destinataire (optionnel)</span>
          <input
            type="email"
            name="recipientEmail"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="client@exemple.cd"
            disabled={loading || !!success}
            style={{ ...inputStyle, marginTop: '0.5rem' }}
          />
        </label>
      </section>

      <section
        style={{
          ...webCardStyle,
          padding: '2rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ ...sectionTitleStyle, marginBottom: '0.5rem' }}>Casier & compartiment</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: colors.textMuted, maxWidth: 520 }}>
              Choisissez un casier puis un compartiment libre (S, M ou L). Laissez vide pour que le
              client choisisse dans l’app mobile.
            </p>
          </div>
          {lockerId ? (
            <button
              type="button"
              onClick={handleClearLocker}
              style={{
                ...webSecondaryButtonStyle,
                height: 36,
                padding: '0 1rem',
                fontSize: '0.8125rem',
              }}
            >
              Effacer la sélection
            </button>
          ) : null}
        </div>

        {lockers.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500 }}>
            Aucun casier en base. Exécutez <code>pnpm db:seed</code> puis rechargez la page.
          </p>
        ) : (
          <LockerPicker
            lockers={lockers}
            selectedLockerId={lockerId}
            onSelectLocker={handleSelectLocker}
          />
        )}

        {lockerId ? (
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.5rem',
              borderTop: borderSubtle(),
            }}
          >
            <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>
              {selectedLocker?.name ?? compartmentData?.locker.name}
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', opacity: 0.75 }}>
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
                  onSelect={setCompartmentId}
                />
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    opacity: 0.65,
                  }}
                >
                  <span>■ Disponible</span>
                  <span>■ Réservé</span>
                  <span>■ Occupé</span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.danger }}>
                {compartmentError ?? 'Impossible d’afficher la grille de ce casier.'}
              </p>
            )}
          </div>
        ) : null}
      </section>

      <button
        type="submit"
        disabled={loading || !!success}
        style={{
          ...webPrimaryButtonStyle,
          width: '100%',
          maxWidth: 560,
          height: spacing.buttonHeight,
          fontSize: '0.9375rem',
          cursor: loading || success ? 'wait' : 'pointer',
          opacity: loading || success ? 0.7 : 1,
        }}
      >
        {loading ? 'Création en cours…' : success ? 'Colis créé' : 'Créer le colis'}
      </button>
    </form>
  );
}
