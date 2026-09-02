'use client';

import { webCardStyle } from '@eveider/config-ui';
import { Button, InlineAlert } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssignableCourierView } from '@/server/couriers';

type BusinessAssignCourierProps = {
  parcelId: string;
  couriers: AssignableCourierView[];
  kind?: 'outbound' | 'return';
  title?: string;
  buttonLabel?: string;
};

export function BusinessAssignCourier({
  parcelId,
  couriers,
  kind = 'outbound',
  title = 'Assigner un coursier',
  buttonLabel = 'Assigner',
}: BusinessAssignCourierProps) {
  const router = useRouter();
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAssign() {
    if (!courierId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/organisation/parcels/${parcelId}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId, kind }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Assignation impossible');
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ ...webCardStyle, padding: '1.25rem', marginTop: '1.25rem' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>{title}</h3>
      {kind === 'return' ? (
        <p style={{ margin: '0 0 0.75rem', fontSize: 14 }}>
          Le coursier ramène le colis du point vers votre entreprise.
        </p>
      ) : null}
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {couriers.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14 }}>Aucun coursier actif dans cette entreprise.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={courierId} onChange={(e) => setCourierId(e.target.value)} style={{ flex: 1, minHeight: 40 }}>
            <option value="">Choisir un coursier de l’entreprise</option>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.fullName ?? courier.email ?? courier.id}
              </option>
            ))}
          </select>
          <Button disabled={!courierId || saving} onClick={() => void handleAssign()}>
            {saving ? (kind === 'return' ? 'Création…' : 'Assignation…') : buttonLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
