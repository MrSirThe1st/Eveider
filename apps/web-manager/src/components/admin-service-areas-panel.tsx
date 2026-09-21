'use client';

import {
  colors,
  spacing,
  webCardStyle,
  webInputStyle,
  webSecondaryButtonStyle,
} from '@eveider/config-ui';
import {
  DataTable,
  EmptyState,
  IconMapPin,
  StatusBadge,
  TableCellStack,
  type DataTableColumn,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import type { CityDto } from '@/lib/city-presenter';
import {
  formatZoneDisplayName,
  groupZonesByCity,
  isHoldingZoneCode,
} from '@/lib/geography-presentation';
import type { LockerSummaryDto } from '@/lib/locker-presenter';
import type { ServiceAreaDto } from '@/lib/service-area-presenter';

type AdminServiceAreasPanelProps = {
  initialCities: CityDto[];
  initialAreas: ServiceAreaDto[];
  lockers?: LockerSummaryDto[];
};

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
  width: '100%',
};

const compactButtonStyle: React.CSSProperties = {
  ...webSecondaryButtonStyle,
  height: 32,
  padding: '0 0.75rem',
  fontSize: '0.75rem',
};

export function AdminServiceAreasPanel({
  initialCities,
  initialAreas,
  lockers = [],
}: AdminServiceAreasPanelProps) {
  const router = useRouter();
  const [cities, setCities] = useState(initialCities);
  const [areas, setAreas] = useState(initialAreas);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [zoneFormCityId, setZoneFormCityId] = useState<string | null>(null);

  const [cityCode, setCityCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityNotes, setCityNotes] = useState('');

  const [zoneCode, setZoneCode] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneNotes, setZoneNotes] = useState('');

  const visibleCities = useMemo(
    () => (includeArchived ? cities : cities.filter((city) => city.status === 'active')),
    [cities, includeArchived],
  );
  const visibleAreas = useMemo(
    () => (includeArchived ? areas : areas.filter((area) => area.status === 'active')),
    [areas, includeArchived],
  );
  const cityGroups = useMemo(() => {
    const grouped = groupZonesByCity(visibleAreas);
    const extraCities = visibleCities.filter(
      (city) => !grouped.some((group) => group.cityId === city.id || group.city === city.name),
    );
    return [
      ...grouped.map((group) => ({
        ...group,
        cityRecord: visibleCities.find((city) => city.id === group.cityId) ?? null,
      })),
      ...extraCities.map((city) => ({
        city: city.name,
        cityId: city.id,
        zones: [] as ServiceAreaDto[],
        cityRecord: city,
      })),
    ];
  }, [visibleAreas, visibleCities]);

  const lockersByZone = useMemo(() => {
    const map = new Map<string, LockerSummaryDto[]>();
    for (const locker of lockers) {
      if (!locker.serviceAreaId || locker.status === 'archived') continue;
      const list = map.get(locker.serviceAreaId) ?? [];
      list.push(locker);
      map.set(locker.serviceAreaId, list);
    }
    return map;
  }, [lockers]);

  async function reload() {
    const query = includeArchived ? '?includeArchived=true' : '';
    const [cityRes, areaRes] = await Promise.all([
      fetch(`/api/cities${query}`, { cache: 'no-store' }),
      fetch(`/api/service-areas${query}`, { cache: 'no-store' }),
    ]);
    const [cityJson, areaJson] = await Promise.all([cityRes.json(), areaRes.json()]);
    if (cityJson.success) setCities(cityJson.data.cities);
    if (areaJson.success) setAreas(areaJson.data.serviceAreas);
  }

  function flash(nextSuccess: string | null, nextError: string | null) {
    setSuccess(nextSuccess);
    setError(nextError);
  }

  async function createCity() {
    setSaving(true);
    flash(null, null);
    try {
      const response = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cityCode,
          name: cityName,
          notes: cityNotes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Création de la ville échouée');
        return;
      }
      setCityCode('');
      setCityName('');
      setCityNotes('');
      setShowCityForm(false);
      flash(`Ville ${result.data.city.name} créée.`, null);
      await reload();
      router.refresh();
    } catch {
      flash(null, 'Impossible de créer la ville.');
    } finally {
      setSaving(false);
    }
  }

  async function createZone(cityId: string) {
    setSaving(true);
    flash(null, null);
    try {
      const response = await fetch('/api/service-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          code: zoneCode,
          name: zoneName,
          notes: zoneNotes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Création de la zone échouée');
        return;
      }
      setZoneCode('');
      setZoneName('');
      setZoneNotes('');
      setZoneFormCityId(null);
      flash(`Zone ${result.data.serviceArea.name} créée. Tarifs : non configuré.`, null);
      await reload();
      router.refresh();
    } catch {
      flash(null, 'Impossible de créer la zone.');
    } finally {
      setSaving(false);
    }
  }

  async function patchCity(id: string, body: Record<string, unknown>, successMessage: string) {
    flash(null, null);
    try {
      const response = await fetch(`/api/cities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Mise à jour échouée');
        return;
      }
      flash(successMessage, null);
      await reload();
      router.refresh();
    } catch {
      flash(null, 'Impossible de mettre à jour la ville.');
    }
  }

  async function patchZone(id: string, body: Record<string, unknown>, successMessage: string) {
    flash(null, null);
    try {
      const response = await fetch(`/api/service-areas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Mise à jour échouée');
        return;
      }
      flash(successMessage, null);
      await reload();
      router.refresh();
    } catch {
      flash(null, 'Impossible de mettre à jour la zone.');
    }
  }

  async function archiveZone(area: ServiceAreaDto) {
    if (area.status === 'active' && area.lockerCount > 0) {
      flash(
        null,
        `Impossible d’archiver « ${formatZoneDisplayName(area)} » : réassignez d’abord ses ${area.lockerCount} casier${area.lockerCount > 1 ? 's' : ''} actif${area.lockerCount > 1 ? 's' : ''}.`,
      );
      return;
    }
    await patchZone(area.id, { status: 'archived' }, 'Zone archivée.');
  }

  async function archiveCity(city: CityDto) {
    const activeZones = areas.filter((area) => area.cityId === city.id && area.status === 'active');
    if (activeZones.length > 0) {
      flash(
        null,
        `Impossible d’archiver ${city.name} : archivez d’abord ses ${activeZones.length} zone${activeZones.length > 1 ? 's' : ''} active${activeZones.length > 1 ? 's' : ''}.`,
      );
      return;
    }
    await patchCity(city.id, { status: 'archived' }, 'Ville archivée.');
  }

  const zoneColumns = useMemo<DataTableColumn<ServiceAreaDto>[]>(
    () => [
      {
        id: 'name',
        header: 'Zone',
        sortable: true,
        sortValue: (row) => formatZoneDisplayName(row),
        cell: (row) => {
          const holding = isHoldingZoneCode(row.code);
          const zoneLockers = lockersByZone.get(row.id) ?? [];
          return (
            <TableCellStack
              primary={formatZoneDisplayName(row)}
              secondary={
                holding && zoneLockers.length > 0
                  ? `${row.code} · ${zoneLockers.map((locker) => locker.name).join(', ')}`
                  : row.code
              }
            />
          );
        },
      },
      {
        id: 'lockers',
        header: 'Casiers',
        sortable: true,
        sortValue: (row) => row.lockerCount,
        numeric: true,
        cell: (row) =>
          `${row.lockerCount} casier${row.lockerCount > 1 ? 's' : ''}${
            isHoldingZoneCode(row.code) ? ' à répartir' : ''
          }`,
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge tone={row.status === 'active' ? 'success' : 'neutral'}>
            {row.status === 'active' ? 'Actif' : 'Archivé'}
          </StatusBadge>
        ),
      },
    ],
    [lockersByZone],
  );

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {success ? <FlashBanner message={success} /> : null}
      {error ? <FlashBanner message={error} variant="error" /> : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.textMuted }}>
          Géographie d’exploitation. Les tarifs se règlent à part.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                const next = event.target.checked;
                setIncludeArchived(next);
                void (async () => {
                  const query = next ? '?includeArchived=true' : '';
                  const [cityRes, areaRes] = await Promise.all([
                    fetch(`/api/cities${query}`, { cache: 'no-store' }),
                    fetch(`/api/service-areas${query}`, { cache: 'no-store' }),
                  ]);
                  const [cityJson, areaJson] = await Promise.all([cityRes.json(), areaRes.json()]);
                  if (cityJson.success) setCities(cityJson.data.cities);
                  if (areaJson.success) setAreas(areaJson.data.serviceAreas);
                })();
              }}
            />
            Afficher les archives
          </label>
          <button type="button" onClick={() => setShowCityForm((open) => !open)} style={compactButtonStyle}>
            {showCityForm ? 'Annuler' : 'Nouvelle ville'}
          </button>
        </div>
      </div>

      {showCityForm ? (
        <section style={{ ...webCardStyle, padding: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Nouvelle ville</h3>
          <div
            style={{
              display: 'grid',
              gap: '0.85rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              marginTop: '1rem',
            }}
          >
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Code
              <input
                value={cityCode}
                onChange={(event) => setCityCode(event.target.value.toUpperCase())}
                placeholder="ex. GOM"
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Nom
              <input
                value={cityName}
                onChange={(event) => setCityName(event.target.value)}
                placeholder="ex. Goma"
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: '0.85rem', fontSize: '0.75rem', fontWeight: 600 }}>
            Notes (optionnel)
            <input value={cityNotes} onChange={(event) => setCityNotes(event.target.value)} style={inputStyle} />
          </label>
          <button
            type="button"
            disabled={saving || cityCode.trim().length < 2 || cityName.trim().length < 2}
            onClick={() => void createCity()}
            style={{ ...webSecondaryButtonStyle, marginTop: '1rem', height: spacing.buttonHeight, padding: '0 1.25rem' }}
          >
            {saving ? 'Création…' : 'Créer la ville'}
          </button>
        </section>
      ) : null}

      {cityGroups.length === 0 ? (
        <EmptyState
          compact
          title="Aucune ville pour le moment"
          description="Créez une ville, puis des zones de quartier à l’intérieur."
          icon={<IconMapPin />}
        />
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {cityGroups.map((group) => {
            const city = group.cityRecord;
            const archivedCity = city?.status === 'archived';
            return (
              <section key={group.cityId ?? group.city}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                    marginBottom: '0.65rem',
                    paddingBottom: '0.45rem',
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>
                    {group.city}
                    {archivedCity ? (
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted }}>
                        Archivée
                      </span>
                    ) : null}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {city && editingCityId !== city.id ? (
                      <>
                        <button type="button" onClick={() => setEditingCityId(city.id)} style={compactButtonStyle}>
                          Modifier
                        </button>
                        {city.status === 'active' ? (
                          <button type="button" onClick={() => void archiveCity(city)} style={compactButtonStyle}>
                            Archiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void patchCity(city.id, { status: 'active' }, 'Ville réactivée.')}
                            style={compactButtonStyle}
                          >
                            Réactiver
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setZoneFormCityId(city.id)}
                          style={compactButtonStyle}
                        >
                          Nouvelle zone
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {city && editingCityId === city.id ? (
                  <CityEditRow
                    city={city}
                    onCancel={() => setEditingCityId(null)}
                    onSave={(name, notes) => {
                      setEditingCityId(null);
                      void patchCity(city.id, { name, notes: notes.trim() || null }, 'Ville mise à jour.');
                    }}
                  />
                ) : null}

                {group.zones.length === 0 && zoneFormCityId !== city?.id ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
                    Aucune zone dans cette ville.
                  </p>
                ) : group.zones.length > 0 ? (
                  <DataTable
                    columns={zoneColumns}
                    rows={group.zones}
                    getRowId={(row) => row.id}
                    sortBy="name"
                    expandedRowId={editingZoneId}
                    renderExpanded={(area) => (
                      <ZoneEditRow
                        area={area}
                        onCancel={() => setEditingZoneId(null)}
                        onSave={(name, notes) => {
                          setEditingZoneId(null);
                          void patchZone(
                            area.id,
                            { name, notes: notes.trim() || null },
                            'Zone mise à jour.',
                          );
                        }}
                      />
                    )}
                    rowPrimaryAction={(area) => ({
                      label: 'Casiers',
                      href: `/tableau-de-bord/casiers?zoneId=${encodeURIComponent(area.id)}`,
                    })}
                    rowActions={(area) => [
                      {
                        id: 'pricing',
                        label: 'Tarifs',
                        href: `/tableau-de-bord/parametres/facturation#zone-${area.id}`,
                      },
                      {
                        id: 'edit',
                        label: 'Modifier',
                        onClick: () => setEditingZoneId(area.id),
                      },
                      area.status === 'active'
                        ? {
                            id: 'archive',
                            label: 'Archiver',
                            tone: 'danger' as const,
                            onClick: () => void archiveZone(area),
                          }
                        : {
                            id: 'reactivate',
                            label: 'Réactiver',
                            onClick: () =>
                              void patchZone(area.id, { status: 'active' }, 'Zone réactivée.'),
                          },
                    ]}
                  />
                ) : null}

                {city && zoneFormCityId === city.id ? (
                  <div style={{ ...webCardStyle, marginTop: '0.85rem', padding: '1rem 1.15rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
                      Nouvelle zone · {city.name}
                    </h4>
                    <p style={{ margin: '0.35rem 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
                      Pas de tarif ici. La zone sera créée « Non configuré ».
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gap: '0.75rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      }}
                    >
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Nom
                        <input
                          value={zoneName}
                          onChange={(event) => setZoneName(event.target.value)}
                          placeholder="ex. Dilala"
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Code
                        <input
                          value={zoneCode}
                          onChange={(event) => setZoneCode(event.target.value.toUpperCase())}
                          placeholder="ex. KWZ-DILALA"
                          style={inputStyle}
                        />
                      </label>
                    </div>
                    <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      Notes (optionnel)
                      <input value={zoneNotes} onChange={(event) => setZoneNotes(event.target.value)} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                      <button
                        type="button"
                        disabled={saving || zoneCode.trim().length < 2 || zoneName.trim().length < 2}
                        onClick={() => void createZone(city.id)}
                        style={{ ...webSecondaryButtonStyle, height: 36, padding: '0 0.9rem', fontSize: '0.75rem' }}
                      >
                        {saving ? 'Création…' : 'Créer la zone'}
                      </button>
                      <button type="button" onClick={() => setZoneFormCityId(null)} style={compactButtonStyle}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CityEditRow({
  city,
  onCancel,
  onSave,
}: {
  city: CityDto;
  onCancel: () => void;
  onSave: (name: string, notes: string) => void;
}) {
  const [name, setName] = useState(city.name);
  const [notes, setNotes] = useState(city.notes ?? '');
  return (
    <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '0.75rem' }}>
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
          style={compactButtonStyle}
        >
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} style={compactButtonStyle}>
          Annuler
        </button>
      </div>
    </div>
  );
}

function ZoneEditRow({
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
    <div style={{ display: 'grid', gap: '0.65rem' }}>
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
          style={compactButtonStyle}
        >
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} style={compactButtonStyle}>
          Annuler
        </button>
      </div>
    </div>
  );
}
