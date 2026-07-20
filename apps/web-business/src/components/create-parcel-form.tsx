'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { LockerPicker } from '@/components/locker-picker';

type LockerOption = {
  id: string;
  name: string;
  address: string;
  availableCompartments: number;
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.5rem',
  height: 48,
  padding: '0 12px',
  border: `2px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
};

export function CreateParcelForm() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [lockerId, setLockerId] = useState('');
  const [lockers, setLockers] = useState<LockerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/lockers')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setLockers(result.data.lockers);
        }
      })
      .catch(() => {
        /* lockers optional */
      });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim(),
          recipientName: recipientName.trim() || undefined,
          recipientPhone: recipientPhone.trim(),
          lockerId: lockerId || undefined,
        }),
      });

      let result: { success: boolean; data?: { parcel: { id: string } }; error?: string };
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

      const parcelRef = reference.trim();
      setSuccess(`Colis ${parcelRef} créé avec succès. Redirection…`);
      setLoading(false);

      window.setTimeout(() => {
        router.replace(`/tableau-de-bord/colis/${result.data!.parcel.id}?created=1`);
      }, 900);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      setLoading(false);
    }
  }

  return (
    <form
      method="post"
      action="/tableau-de-bord/colis/nouveau"
      onSubmit={(event) => void handleSubmit(event)}
      style={{
        background: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '2rem',
        maxWidth: 560,
      }}
    >
      {success ? <FlashBanner message={success} /> : null}
      {error ? <FlashBanner message={error} variant="error" onDismiss={() => setError(null)} /> : null}

      <label style={{ display: 'block' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>RÉFÉRENCE / N° COMMANDE</span>
        <input
          type="text"
          name="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="CMD-2026-001"
          required
          disabled={loading || !!success}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginTop: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>NOM DESTINATAIRE</span>
        <input
          type="text"
          name="recipientName"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Jean Mukendi"
          disabled={loading || !!success}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginTop: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>TÉLÉPHONE DESTINATAIRE</span>
        <input
          type="tel"
          name="recipientPhone"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          placeholder="+243800000000"
          required
          disabled={loading || !!success}
          style={inputStyle}
        />
      </label>

      <div style={{ display: 'block', marginTop: '1.25rem' }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          CASIER DE DESTINATION
        </span>
        {lockers.length === 0 ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>
            Aucun casier en base. Exécutez <code>pnpm db:seed</code> puis rechargez la page.
          </p>
        ) : (
          <LockerPicker
            lockers={lockers}
            selectedLockerId={lockerId}
            onSelectLocker={(id) => setLockerId(id)}
          />
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !!success}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          height: spacing.buttonHeight,
          background: colors.primary,
          color: colors.secondary,
          border: 'none',
          borderRadius: radius.button,
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: loading || success ? 'wait' : 'pointer',
          opacity: loading || success ? 0.7 : 1,
        }}
      >
        {loading ? 'CRÉATION EN COURS…' : success ? 'COLIS CRÉÉ' : 'CRÉER LE COLIS'}
      </button>
    </form>
  );
}
