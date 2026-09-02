'use client';

import {
  colors,
  spacing,
  webCardStyle,
  webInputStyle,
  webSecondaryButtonStyle,
} from '@eveider/config-ui';
import { DRC_CITIES } from '@eveider/domain';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlashBanner } from '@/components/flash-banner';
import type { ServiceAreaDto } from '@/lib/service-area-presenter';

type AdminServiceAreasPanelProps = {
  initialAreas: ServiceAreaDto[];
};

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
  width: '100%',
};

export function AdminServiceAreasPanel({ initialAreas }: AdminServiceAreasPanelProps) {
  const router = useRouter();
  const [areas, setAreas] = useState(initialAreas);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState<string>(DRC_CITIES.includes('Kinshasa') ? 'Kinshasa' : DRC_CITIES[0]!);
  const [notes, setNotes] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleAreas = useMemo(
    () => (includeArchived ? areas : areas.filter((area) => area.status === 'active')),
    [areas, includeArchived],
  );

  async function reload() {
    const query = includeArchived ? '?includeArchived=true' : '';
    const response = await fetch(`/api/service-areas${query}`, { cache: 'no-store' });
    const result = await response.json();
    if (result.success) {
      setAreas(result.data.serviceAreas);
    }
  }

  async function createArea() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/service-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          city,
          notes: notes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Création échouée');
        return;
      }
      setCode('');
      setName('');
      setNotes('');
      setSuccess(`Zone ${result.data.serviceArea.name} créée.`);
      await reload();
      router.refresh();
    } catch {
      setError('Impossible de créer la zone.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveArea(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/service-areas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Archivage échoué');
        return;
      }
      setSuccess('Zone archivée.');
      await reload();
      router.refresh();
    } catch {
      setError('Impossible d’archiver la zone.');
    }
  }

  async function reactivateArea(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/service-areas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Réactivation échouée');
        return;
      }
      setSuccess('Zone réactivée.');
      await reload();
      router.refresh();
    } catch {
      setError('Impossible de réactiver la zone.');
    }
  }

  async function saveEdit(area: ServiceAreaDto, nextName: string, nextNotes: string) {
    setEditingId(null);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/service-areas/${area.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName.trim(),
          notes: nextNotes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Mise à jour échouée');
        return;
      }
      setSuccess('Zone mise à jour.');
      await reload();
      router.refresh();
    } catch {
      setError('Impossible de mettre à jour la zone.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {success ? <FlashBanner message={success} /> : null}
      {error ? <FlashBanner message={error} variant="error" /> : null}

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Nouvelle zone</h3>
        <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '0.8125rem', opacity: 0.75 }}>
          Une zone regroupe les points d’une ville. Les points peuvent y être rattachés ensuite.
        </p>
        <div
          style={{
            display: 'grid',
            gap: '0.85rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ex. KIN"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Nom
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex. Kinshasa"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Ville
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              style={inputStyle}
            >
              {DRC_CITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: 'block', marginTop: '0.85rem', fontSize: '0.75rem', fontWeight: 600 }}>
          Notes (optionnel)
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            style={inputStyle}
          />
        </label>
        <button
          type="button"
          disabled={saving || code.trim().length < 2 || name.trim().length < 2}
          onClick={() => void createArea()}
          style={{
            ...webSecondaryButtonStyle,
            marginTop: '1rem',
            height: spacing.buttonHeight,
            padding: '0 1.25rem',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Création…' : 'Créer la zone'}
        </button>
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {visibleAreas.length} zone{visibleAreas.length > 1 ? 's' : ''}
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked);
                void (async () => {
                  const query = event.target.checked ? '?includeArchived=true' : '';
                  const response = await fetch(`/api/service-areas${query}`, { cache: 'no-store' });
                  const result = await response.json();
                  if (result.success) setAreas(result.data.serviceAreas);
                })();
              }}
            />
            Afficher les zones archivées
          </label>
        </div>

        {visibleAreas.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.8 }}>Aucune zone pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {visibleAreas.map((area) => (
              <article key={area.id} style={{ ...webCardStyle, padding: '1.25rem 1.5rem' }}>
                {editingId === area.id ? (
                  <ServiceAreaEditRow
                    area={area}
                    onCancel={() => setEditingId(null)}
                    onSave={(nextName, nextNotes) => void saveEdit(area, nextName, nextNotes)}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {area.name}{' '}
                        <span style={{ fontWeight: 600, opacity: 0.7 }}>({area.code})</span>
                      </p>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                        {area.city} · {area.lockerCount} point{area.lockerCount > 1 ? 's' : ''} ·{' '}
                        {area.statusLabel}
                      </p>
                      {area.notes ? (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>
                          {area.notes}
                        </p>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(area.id)}
                        style={{
                          ...webSecondaryButtonStyle,
                          height: 36,
                          padding: '0 0.9rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        Modifier
                      </button>
                      {area.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => void archiveArea(area.id)}
                          style={{
                            ...webSecondaryButtonStyle,
                            height: 36,
                            padding: '0 0.9rem',
                            fontSize: '0.75rem',
                            color: colors.danger,
                          }}
                        >
                          Archiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void reactivateArea(area.id)}
                          style={{
                            ...webSecondaryButtonStyle,
                            height: 36,
                            padding: '0 0.9rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          Réactiver
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ServiceAreaEditRow({
  area,
  onCancel,
  onSave,
}: {
  area: ServiceAreaDto;
  onCancel: () => void;
  onSave: (name: string, notes: string) => void;
}) {
  const [name, setName] = useState(area.name);
  const [notes, setNotes] = useState(area.notes ?? '');

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
        Nom
        <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} />
      </label>
      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
        Notes
        <input value={notes} onChange={(event) => setNotes(event.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onSave(name, notes)}
          disabled={name.trim().length < 2}
          style={{
            ...webSecondaryButtonStyle,
            height: 36,
            padding: '0 0.9rem',
            fontSize: '0.75rem',
          }}
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...webSecondaryButtonStyle,
            height: 36,
            padding: '0 0.9rem',
            fontSize: '0.75rem',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
