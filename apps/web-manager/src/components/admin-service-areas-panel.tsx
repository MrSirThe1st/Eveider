'use client';

import {
  colors,
  spacing,
  typography,
  webCardStyle,
  webInputStyle,
  webSecondaryButtonStyle,
} from '@eveider/config-ui';
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  IconMapPin,
  PageFrame,
  type DropdownMenuItem,
} from '@eveider/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { ListSearchField } from '@/components/list-search-field';
import { LockerGoogleMap } from '@/components/locker-google-map';
import type { CityDto, DrcCatalogCityDto } from '@/lib/city-presenter';
import {
  formatZoneDisplayName,
  groupZonesByCity,
  isHoldingZone,
} from '@/lib/geography-presentation';
import { matchesListSearch } from '@/lib/list-search';
import { toLockerMapMarkerDto, type LockerSummaryDto } from '@/lib/locker-presenter';
import type { ServiceAreaDto } from '@/lib/service-area-presenter';

type AdminServiceAreasPanelProps = {
  initialCities: CityDto[];
  initialAreas: ServiceAreaDto[];
  catalog: DrcCatalogCityDto[];
  lockers?: LockerSummaryDto[];
};

type CityGroup = {
  city: string;
  cityId: string | null;
  zones: ServiceAreaDto[];
  cityRecord: CityDto | null;
};

const inputStyle: CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
  width: '100%',
};

const compactButtonStyle: CSSProperties = {
  ...webSecondaryButtonStyle,
  height: 32,
  padding: '0 0.75rem',
  fontSize: '0.75rem',
};

function formatFrCount(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

function zoneCasiersHref(area: ServiceAreaDto): string {
  const params = new URLSearchParams();
  if (area.cityId) params.set('cityId', area.cityId);
  params.set('zoneId', area.id);
  return `/tableau-de-bord/casiers?${params.toString()}`;
}

function groupKey(group: Pick<CityGroup, 'city' | 'cityId'>): string {
  return group.cityId ?? group.city;
}

export function AdminServiceAreasPanel({
  initialCities,
  initialAreas,
  catalog,
  lockers = [],
}: AdminServiceAreasPanelProps) {
  const router = useRouter();
  const [cities, setCities] = useState(initialCities);
  const [areas, setAreas] = useState(initialAreas);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [zoneFormCityId, setZoneFormCityId] = useState<string | null>(null);

  const [drcCityId, setDrcCityId] = useState('');
  const [cityNotes, setCityNotes] = useState('');

  const [zoneName, setZoneName] = useState('');
  const [zoneNotes, setZoneNotes] = useState('');
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'city'; city: CityDto }
    | { kind: 'zone'; area: ServiceAreaDto }
    | null
  >(null);

  const visibleCities = useMemo(
    () => (includeArchived ? cities : cities.filter((city) => city.status === 'active')),
    [cities, includeArchived],
  );
  const visibleAreas = useMemo(
    () => (includeArchived ? areas : areas.filter((area) => area.status === 'active')),
    [areas, includeArchived],
  );
  const availableCatalog = useMemo(() => {
    const activeDrcIds = new Set(
      cities.flatMap((city) =>
        city.status === 'active' && city.drcCityId ? [city.drcCityId] : [],
      ),
    );
    return catalog.filter((city) => !activeDrcIds.has(city.id));
  }, [catalog, cities]);
  const catalogByProvince = useMemo(() => {
    const groups: Array<{ province: string; cities: DrcCatalogCityDto[] }> = [];
    for (const city of availableCatalog) {
      const last = groups[groups.length - 1];
      if (last && last.province === city.province) {
        last.cities.push(city);
      } else {
        groups.push({ province: city.province, cities: [city] });
      }
    }
    return groups;
  }, [availableCatalog]);
  const selectedCatalogCity = availableCatalog.find((city) => city.id === drcCityId) ?? null;
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

  const filteredGroups = useMemo(() => {
    return cityGroups
      .map((group) => {
        const province = group.cityRecord?.province;
        const cityMatches = matchesListSearch(
          searchQuery,
          group.city,
          group.cityRecord?.code,
          province,
        );
        const zones = cityMatches
          ? group.zones
          : group.zones.filter((zone) =>
              matchesListSearch(searchQuery, formatZoneDisplayName(zone), zone.name, zone.code),
            );
        if (!cityMatches && zones.length === 0) return null;
        return { ...group, zones };
      })
      .filter((group): group is CityGroup => group != null);
  }, [cityGroups, searchQuery]);

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
    const [cityRes, areaRes] = await Promise.all([
      fetch('/api/cities?includeArchived=true', { cache: 'no-store' }),
      fetch('/api/service-areas?includeArchived=true', { cache: 'no-store' }),
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
          drcCityId,
          notes: cityNotes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Création de la ville échouée');
        return;
      }
      setDrcCityId('');
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
          name: zoneName,
          notes: zoneNotes.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Création de la zone échouée');
        return;
      }
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

  function neighborhoodZones(cityId: string) {
    return areas.filter((area) => area.cityId === cityId && !isHoldingZone(area));
  }

  function cityLockerTotal(cityId: string) {
    return areas
      .filter((area) => area.cityId === cityId)
      .reduce((sum, area) => sum + area.lockerCount, 0);
  }

  async function archiveCity(city: CityDto) {
    const activeZones = neighborhoodZones(city.id).filter((area) => area.status === 'active');
    if (activeZones.length > 0) {
      flash(
        null,
        `Impossible d’archiver ${city.name} : supprimez d’abord ses ${activeZones.length} zone${activeZones.length > 1 ? 's' : ''} active${activeZones.length > 1 ? 's' : ''}.`,
      );
      return;
    }
    const lockers = cityLockerTotal(city.id);
    if (lockers > 0) {
      flash(
        null,
        `Impossible d’archiver ${city.name} : réassignez d’abord ses ${lockers} casier${lockers > 1 ? 's' : ''}.`,
      );
      return;
    }
    await patchCity(city.id, { status: 'archived' }, 'Ville archivée.');
  }

  function requestDeleteZone(area: ServiceAreaDto) {
    if (isHoldingZone(area)) {
      flash(null, 'Cette zone ne peut pas être supprimée.');
      return;
    }
    if (area.lockerCount > 0) {
      flash(
        null,
        `Impossible de supprimer « ${formatZoneDisplayName(area)} » : réassignez d’abord ses ${area.lockerCount} casier${area.lockerCount > 1 ? 's' : ''}.`,
      );
      return;
    }
    setPendingDelete({ kind: 'zone', area });
  }

  function requestDeleteCity(city: CityDto) {
    const zones = neighborhoodZones(city.id);
    if (zones.length > 0) {
      flash(
        null,
        `Impossible de supprimer ${city.name} : supprimez d’abord ses ${zones.length} zone${zones.length > 1 ? 's' : ''}.`,
      );
      return;
    }
    const lockers = cityLockerTotal(city.id);
    if (lockers > 0) {
      flash(
        null,
        `Impossible de supprimer ${city.name} : réassignez d’abord ses ${lockers} casier${lockers > 1 ? 's' : ''}.`,
      );
      return;
    }
    setPendingDelete({ kind: 'city', city });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    flash(null, null);
    try {
      const path =
        pendingDelete.kind === 'city'
          ? `/api/cities/${pendingDelete.city.id}`
          : `/api/service-areas/${pendingDelete.area.id}`;
      const response = await fetch(path, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        flash(null, result.error ?? 'Suppression échouée');
        return;
      }
      if (pendingDelete.kind === 'city') {
        if (selectedCityKey === pendingDelete.city.id) setSelectedCityKey(null);
        flash(`Ville ${pendingDelete.city.name} supprimée.`, null);
      } else {
        flash(`Zone ${formatZoneDisplayName(pendingDelete.area)} supprimée.`, null);
      }
      setPendingDelete(null);
      await reload();
      router.refresh();
    } catch {
      flash(null, 'Impossible de supprimer.');
    } finally {
      setSaving(false);
    }
  }

  function cityMenuItems(city: CityDto): DropdownMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Modifier',
        onClick: () => setEditingCityId(city.id),
      },
      {
        id: 'new-zone',
        label: 'Nouvelle zone',
        onClick: () => {
          setZoneFormCityId(city.id);
          setSelectedCityKey(city.id);
        },
      },
      city.status === 'active'
        ? {
            id: 'archive',
            label: 'Archiver',
            tone: 'danger' as const,
            onClick: () => void archiveCity(city),
          }
        : {
            id: 'reactivate',
            label: 'Réactiver',
            onClick: () => void patchCity(city.id, { status: 'active' }, 'Ville réactivée.'),
          },
      {
        id: 'delete',
        label: 'Supprimer',
        tone: 'danger' as const,
        onClick: () => requestDeleteCity(city),
      },
    ];
  }

  function zoneMenuItems(area: ServiceAreaDto): DropdownMenuItem[] {
    return [
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
      ...(area.status === 'archived'
        ? [
            {
              id: 'reactivate',
              label: 'Réactiver',
              onClick: () => void patchZone(area.id, { status: 'active' }, 'Zone réactivée.'),
            },
          ]
        : []),
      {
        id: 'delete',
        label: 'Supprimer',
        tone: 'danger' as const,
        onClick: () => requestDeleteZone(area),
      },
    ];
  }

  const searchActive = searchQuery.trim().length > 0;
  const emptyTitle = searchActive ? 'Aucun résultat' : 'Aucune ville pour le moment';
  const emptyDescription = searchActive
    ? 'Aucune ville ni zone ne correspond à la recherche.'
    : 'Choisissez une ville du référentiel, puis créez des zones à l’intérieur.';

  return (
    <PageFrame
      title="Villes et zones"
      description="Gérez les zones géographiques du réseau Eveider."
      layout="standard"
      action={
        <Button
          variant={showCityForm ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setShowCityForm((open) => !open)}
        >
          {showCityForm ? 'Annuler' : 'Nouvelle ville'}
        </Button>
      }
    >
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
          <ListSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher..."
            ariaLabel="Rechercher une ville ou une zone"
          />
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: typography.bodySm.fontSize,
              color: colors.secondary,
              fontWeight: typography.weights.medium,
              whiteSpace: 'nowrap',
            }}
          >
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Afficher les archivées
          </label>
        </div>

        {showCityForm ? (
          <section style={{ ...webCardStyle, padding: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Nouvelle ville</h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
              Choisissez une ville du référentiel. La province est attachée automatiquement.
            </p>
            {catalogByProvince.length === 0 ? (
              <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
                Toutes les villes du référentiel sont déjà dans le réseau.
              </p>
            ) : (
              <>
                <label style={{ display: 'block', marginTop: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  Ville
                  <select
                    value={drcCityId}
                    onChange={(event) => setDrcCityId(event.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">Choisir une ville</option>
                    {catalogByProvince.map((group) => (
                      <optgroup key={group.province} label={group.province}>
                        {group.cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {selectedCatalogCity ? (
                  <p style={{ margin: '0.65rem 0 0', fontSize: '0.8125rem', color: colors.textMuted }}>
                    Province : {selectedCatalogCity.province}
                  </p>
                ) : null}
                <label style={{ display: 'block', marginTop: '0.85rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  Notes (optionnel)
                  <input
                    value={cityNotes}
                    onChange={(event) => setCityNotes(event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <button
                  type="button"
                  disabled={saving || !drcCityId}
                  onClick={() => void createCity()}
                  style={{
                    ...webSecondaryButtonStyle,
                    marginTop: '1rem',
                    height: spacing.buttonHeight,
                    padding: '0 1.25rem',
                  }}
                >
                  {saving ? 'Création…' : 'Créer la ville'}
                </button>
              </>
            )}
          </section>
        ) : null}

        {filteredGroups.length === 0 ? (
          <EmptyState compact title={emptyTitle} description={emptyDescription} icon={<IconMapPin />} />
        ) : (
          <div>
            {filteredGroups.map((group, index) => {
              const city = group.cityRecord;
              const key = groupKey(group);
              const selected = selectedCityKey === key;
              const archivedCity = city?.status === 'archived';
              const province = city?.province ?? null;
              const listedZones = group.zones.filter((zone) => !isHoldingZone(zone));
              const cityLockers = group.zones.flatMap((zone) => lockersByZone.get(zone.id) ?? []);
              const mapMarkers = cityLockers
                .map((locker) =>
                  toLockerMapMarkerDto({
                    ...locker,
                    availableCompartments: locker.compartmentCounts.available,
                  }),
                )
                .filter((marker) => marker != null);

              return (
                <section
                  key={key}
                  style={{
                    padding: selected ? '1rem 1rem 1.15rem' : '1rem 0',
                    margin: selected ? '0 -1rem' : 0,
                    borderTop: index === 0 ? undefined : `1px solid ${colors.borderSubtle}`,
                    background: selected ? colors.surfaceSubtle : undefined,
                    borderRadius: selected ? 12 : 0,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      columnGap: '1rem',
                      rowGap: 2,
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedCityKey(selected ? null : key)}
                      style={{
                        display: 'grid',
                        gap: 2,
                        margin: 0,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: typography.itemTitle.fontSize,
                          fontWeight: typography.itemTitle.fontWeight,
                          lineHeight: typography.itemTitle.lineHeight,
                          color: colors.secondary,
                        }}
                      >
                        {group.city}
                        {archivedCity ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: typography.caption.fontSize,
                              fontWeight: typography.weights.semibold,
                              color: colors.textMuted,
                            }}
                          >
                            Archivée
                          </span>
                        ) : null}
                      </h2>
                      {province ? (
                        <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
                          {province}
                        </span>
                      ) : null}
                    </button>
                    <div
                      style={{
                        display: 'grid',
                        justifyItems: 'end',
                        alignItems: 'center',
                        rowGap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: typography.bodySm.fontSize,
                          fontWeight: typography.weights.medium,
                          color: colors.textMuted,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatFrCount(listedZones.length, 'zone', 'zones')}
                      </span>
                      {city && editingCityId !== city.id ? (
                        <DropdownMenu label="Actions de la ville" items={cityMenuItems(city)} />
                      ) : null}
                    </div>
                  </div>

                  {city && editingCityId === city.id ? (
                    <CityEditRow
                      city={city}
                      onCancel={() => setEditingCityId(null)}
                      onSave={(notes) => {
                        setEditingCityId(null);
                        void patchCity(city.id, { notes: notes.trim() || null }, 'Ville mise à jour.');
                      }}
                    />
                  ) : null}

                  {listedZones.length === 0 && zoneFormCityId !== city?.id ? (
                    <p
                      style={{
                        margin: '0.75rem 0 0',
                        paddingLeft: selected ? 0 : 28,
                        fontSize: typography.bodySm.fontSize,
                        color: colors.textMuted,
                      }}
                    >
                      Aucune zone dans cette ville.
                    </p>
                  ) : listedZones.length > 0 ? (
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: '0.75rem 0 0',
                        padding: 0,
                        display: 'grid',
                        gap: 2,
                      }}
                    >
                      {listedZones.map((area) => {
                        const countLabel = formatFrCount(area.lockerCount, 'casier', 'casiers');
                        return (
                          <li key={area.id}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                minHeight: 36,
                                paddingLeft: selected ? 0 : 28,
                              }}
                            >
                              {selected ? (
                                <span
                                  aria-hidden
                                  style={{
                                    flexShrink: 0,
                                    width: 12,
                                    height: 12,
                                    marginRight: 8,
                                    borderLeft: `1.5px solid ${colors.textMuted}`,
                                    borderBottom: `1.5px solid ${colors.textMuted}`,
                                    opacity: 0.55,
                                  }}
                                />
                              ) : null}
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: typography.bodySm.fontSize,
                                  fontWeight: typography.weights.medium,
                                  color: colors.secondary,
                                }}
                              >
                                {formatZoneDisplayName(area)}
                                {area.status === 'archived' ? (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      fontSize: typography.caption.fontSize,
                                      fontWeight: typography.weights.semibold,
                                      color: colors.textMuted,
                                    }}
                                  >
                                    Archivé
                                  </span>
                                ) : null}
                              </span>
                              <Link
                                href={zoneCasiersHref(area)}
                                aria-label={`Casiers · ${countLabel}`}
                                style={{
                                  flexShrink: 0,
                                  color: colors.textMuted,
                                  fontSize: typography.bodySm.fontSize,
                                  fontWeight: typography.weights.medium,
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {countLabel}
                                {selected ? ' →' : ''}
                              </Link>
                              {editingZoneId !== area.id ? (
                                <DropdownMenu label="Actions de la ligne" items={zoneMenuItems(area)} />
                              ) : null}
                            </div>
                            {editingZoneId === area.id ? (
                              <div style={{ paddingLeft: selected ? 28 : 28, paddingBottom: 8 }}>
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
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {city && zoneFormCityId === city.id ? (
                    <div style={{ ...webCardStyle, marginTop: '0.85rem', padding: '1rem 1.15rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
                        Nouvelle zone · {city.name}
                      </h4>
                      <p style={{ margin: '0.35rem 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
                        Le code interne est attribué automatiquement. La zone sera créée « Non configuré ».
                      </p>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
                        Nom
                        <input
                          value={zoneName}
                          onChange={(event) => setZoneName(event.target.value)}
                          placeholder="ex. Dilala"
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        Notes (optionnel)
                        <input
                          value={zoneNotes}
                          onChange={(event) => setZoneNotes(event.target.value)}
                          style={inputStyle}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                        <button
                          type="button"
                          disabled={saving || zoneName.trim().length < 2}
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

                  {selected ? (
                    <CityMapPreview
                      cityName={group.city}
                      markers={mapMarkers}
                      zones={listedZones}
                    />
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => {
          if (!saving) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
        title={
          pendingDelete?.kind === 'city'
            ? `Supprimer ${pendingDelete.city.name} ?`
            : pendingDelete?.kind === 'zone'
              ? `Supprimer « ${formatZoneDisplayName(pendingDelete.area)} » ?`
              : 'Supprimer ?'
        }
        description={
          pendingDelete?.kind === 'city'
            ? 'La ville disparaîtra du réseau. Vous pourrez la recréer plus tard depuis le référentiel.'
            : 'Cette zone disparaîtra du réseau. Cette action est définitive.'
        }
        confirmLabel="Supprimer"
        tone="danger"
        loading={saving}
      />
    </PageFrame>
  );
}

function CityMapPreview({
  cityName,
  markers,
  zones,
}: {
  cityName: string;
  markers: NonNullable<ReturnType<typeof toLockerMapMarkerDto>>[];
  zones: ServiceAreaDto[];
}) {
  const legend = zones
    .map((zone) => {
      const label = formatZoneDisplayName(zone);
      return `${label} (${zone.lockerCount})`;
    })
    .join('   ·   ');

  return (
    <div style={{ marginTop: '0.9rem' }}>
      {markers.length > 0 ? (
        <div
          style={{
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <LockerGoogleMap
            key={cityName}
            lockers={markers}
            height={200}
            interactive={false}
          />
        </div>
      ) : (
        <div
          style={{
            ...webCardStyle,
            padding: '0.85rem 1rem',
            color: colors.textMuted,
            fontSize: typography.bodySm.fontSize,
          }}
        >
          Aucun casier géolocalisé à {cityName}.
        </div>
      )}
      {legend ? (
        <p
          style={{
            margin: '0.55rem 0 0',
            fontSize: typography.caption.fontSize,
            color: colors.textMuted,
            lineHeight: 1.45,
          }}
        >
          {legend}
        </p>
      ) : null}
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
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(city.notes ?? '');
  return (
    <div style={{ display: 'grid', gap: '0.65rem', margin: '0.85rem 0 0.35rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{city.name}</p>
      {city.province ? (
        <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted }}>Province : {city.province}</p>
      ) : null}
      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
        Notes
        <input value={notes} onChange={(event) => setNotes(event.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={() => onSave(notes)} style={compactButtonStyle}>
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
