'use client';

import { borderSubtle, colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { formatDistanceKm, haversineDistanceKm } from '@eveider/domain';
import { Button, EmptyState, IconBuilding, IconMapPin, IconPackage } from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { LockerGoogleMap } from '@/components/locker-google-map';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import { businessNewParcelPath, WEB_ROUTES } from '@/lib/auth-routing';
import type { BusinessLockerDto, LockerMapMarkerDto } from '@/lib/locker-presenter';
import type { PickupLocationDto } from '@/lib/pickup-location-presenter';

type MapFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
  key: number;
};

type BusinessLockerDirectoryProps = {
  lockers: BusinessLockerDto[];
  pickupLocations: PickupLocationDto[];
};

function buildDirectionsUrl(input: {
  origin?: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
}): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${input.destination.lat},${input.destination.lng}`,
  });
  if (input.origin) {
    params.set('origin', `${input.origin.lat},${input.origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div
        style={{
          fontSize: typography.caption.fontSize,
          fontWeight: 600,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: typography.body.fontSize, color: colors.secondary, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

export function BusinessLockerDirectory({
  lockers,
  pickupLocations,
}: BusinessLockerDirectoryProps) {
  const mappablePickups = useMemo(
    () => pickupLocations.filter((loc) => loc.lat != null && loc.lng != null),
    [pickupLocations],
  );

  const defaultDepartureId =
    mappablePickups.find((loc) => loc.isDefault)?.id ?? mappablePickups[0]?.id ?? '';

  const [departureId, setDepartureId] = useState(defaultDepartureId);
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);

  const departure = mappablePickups.find((loc) => loc.id === departureId) ?? null;

  const mapMarkers = useMemo((): LockerMapMarkerDto[] => {
    return lockers.flatMap((locker) => {
      if (locker.latitude == null || locker.longitude == null) return [];
      return [
        {
          id: locker.id,
          name: locker.networkLabel,
          address: locker.address,
          latitude: locker.latitude,
          longitude: locker.longitude,
          type: locker.type,
          typeLabel: locker.typeLabel,
          status: locker.operatingStatus,
          statusLabel: locker.operatingStatusLabel,
          availableCompartments: locker.availableCompartments,
          availableSlots: locker.availableSlots,
          availableBySize: locker.availableBySize,
          rows: locker.rows,
          columns: locker.columns,
        },
      ];
    });
  }, [lockers]);

  const businessMarkers = useMemo(
    () =>
      mappablePickups.map((loc) => ({
        id: loc.id,
        name: loc.name,
        latitude: loc.lat!,
        longitude: loc.lng!,
      })),
    [mappablePickups],
  );

  const selectedLocker = lockers.find((locker) => locker.id === selectedLockerId) ?? null;

  const distanceLabel = useMemo(() => {
    if (!selectedLocker || selectedLocker.latitude == null || selectedLocker.longitude == null) {
      return null;
    }
    if (departure?.lat == null || departure.lng == null) return null;
    const km = haversineDistanceKm(
      { latitude: departure.lat, longitude: departure.lng },
      { latitude: selectedLocker.latitude, longitude: selectedLocker.longitude },
    );
    return formatDistanceKm(km);
  }, [selectedLocker, departure]);

  function selectLocker(lockerId: string) {
    setSelectedLockerId(lockerId);
    const locker = lockers.find((item) => item.id === lockerId);
    if (locker?.latitude == null || locker.longitude == null) return;
    setMapFocus({
      latitude: locker.latitude,
      longitude: locker.longitude,
      zoom: 14,
      key: Date.now(),
    });
  }

  if (lockers.length === 0) {
    return (
      <EmptyState
        title="Aucun point Eveider pour le moment"
        description="Le réseau de casiers apparaîtra ici dès qu’Eveider ouvrira des points près de vous."
        icon={<IconMapPin />}
      />
    );
  }

  const sizeLine = selectedLocker
    ? `S ${selectedLocker.availableBySize.small} · M ${selectedLocker.availableBySize.medium} · L ${selectedLocker.availableBySize.large}`
    : null;

  return (
    <div style={{ display: 'grid', gap: spacing[4] }}>
      <div
        style={{
          ...webCardStyle,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing[3],
          padding: `${spacing[3]}px ${spacing[4]}px`,
        }}
      >
        <label
          htmlFor="points-departure"
          style={{
            fontSize: typography.bodySm.fontSize,
            fontWeight: 600,
            color: colors.secondary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <IconBuilding width={16} height={16} />
          Départ
        </label>
        {mappablePickups.length > 0 ? (
          <select
            id="points-departure"
            value={departureId}
            onChange={(event) => setDepartureId(event.target.value)}
            style={{
              minWidth: 220,
              maxWidth: '100%',
              flex: '1 1 220px',
              padding: '8px 12px',
              borderRadius: 8,
              border: borderSubtle(),
              background: colors.surface,
              color: colors.secondary,
              fontSize: typography.body.fontSize,
            }}
          >
            {mappablePickups.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.isDefault ? ' (défaut)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ color: colors.textMuted, fontSize: typography.bodySm.fontSize }}>
            Aucune adresse enregistrée —{' '}
            <Link href={WEB_ROUTES.businessSettingsOrganisation} style={{ color: colors.primary }}>
              ajouter un lieu de collecte
            </Link>
          </div>
        )}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: spacing[4],
            fontSize: typography.caption.fontSize,
            color: colors.textMuted,
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#C43C2C',
                display: 'inline-block',
              }}
            />
            Point Eveider
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#1C1917',
                display: 'inline-block',
              }}
            />
            Votre adresse
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedLocker ? 'minmax(0, 1fr) minmax(280px, 380px)' : '1fr',
          gap: spacing[4],
          alignItems: 'stretch',
        }}
        className="business-points-layout"
      >
        <div style={{ minHeight: 520, height: 'min(70vh, 720px)' }}>
          <LockerGoogleMap
            lockers={mapMarkers}
            businessMarkers={businessMarkers}
            selectedBusinessId={departureId || undefined}
            selectedLockerId={selectedLockerId ?? undefined}
            onSelectLocker={selectLocker}
            pinStyle="network"
            mapFocus={mapFocus}
            height="100%"
          />
        </div>
        {selectedLocker ? (
          <aside
            style={{
              ...webCardStyle,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[5],
              padding: spacing[5],
              maxHeight: 640,
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3] }}>
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: typography.sectionTitle.fontSize,
                    fontWeight: typography.sectionTitle.fontWeight,
                    color: colors.secondary,
                  }}
                >
                  {selectedLocker.networkLabel}
                </h2>
                <div style={{ marginTop: spacing[2] }}>
                  <LockerStatusBadge status={selectedLocker.operatingStatus} />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLockerId(null)}>
                Fermer
              </Button>
            </div>

            <DetailRow label="Adresse">{selectedLocker.address}</DetailRow>

            <DetailRow label="Compartiments disponibles">
              {sizeLine}
              <div style={{ color: colors.textMuted, fontSize: typography.caption.fontSize, marginTop: 4 }}>
                {selectedLocker.availableLabel}
              </div>
            </DetailRow>

            <DetailRow label="Opérations">Dépôt · Retrait</DetailRow>

            {selectedLocker.zoneName ? (
              <DetailRow label="Zone">{selectedLocker.zoneName}</DetailRow>
            ) : null}

            <DetailRow label="Tarification">
              {departure ? (
                <div style={{ display: 'grid', gap: 4 }}>
                  <span>Tarif depuis {departure.name}</span>
                  <strong style={{ fontSize: 18 }}>
                    {selectedLocker.outboundDeliveryLabel ?? 'Tarif non disponible'}
                  </strong>
                  <span style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
                    Livraison Eveider vers ce point · payé par le destinataire
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>
                    {selectedLocker.outboundDeliveryLabel ?? 'Tarif non disponible'}
                  </strong>
                  <span style={{ color: colors.textMuted, fontSize: typography.caption.fontSize }}>
                    Ajoutez une adresse de départ pour contextualiser le tarif.
                  </span>
                </div>
              )}
            </DetailRow>

            {distanceLabel ? (
              <DetailRow label="Distance">{distanceLabel} depuis {departure?.name}</DetailRow>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[2],
                marginTop: 'auto',
                paddingTop: spacing[2],
              }}
            >
              {selectedLocker.latitude != null && selectedLocker.longitude != null ? (
                <a
                  className="nb-btn nb-btn-secondary"
                  href={buildDirectionsUrl({
                    origin:
                      departure?.lat != null && departure.lng != null
                        ? { lat: departure.lat, lng: departure.lng }
                        : null,
                    destination: {
                      lat: selectedLocker.latitude,
                      lng: selectedLocker.longitude,
                    },
                  })}
                  target="_blank"
                  rel="noreferrer"
                >
                  Itinéraire
                </a>
              ) : null}

              {selectedLocker.selectable ? (
                <Link
                  href={businessNewParcelPath(selectedLocker.id)}
                  className="nb-btn nb-btn-primary"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <IconPackage width={16} height={16} />
                    Créer un colis vers ce point
                  </span>
                </Link>
              ) : (
                <Button disabled title="Ce point n’accepte pas de colis pour le moment">
                  Point indisponible
                </Button>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .business-points-layout {
            grid-template-columns: 1fr !important;
          }
          .business-points-layout > :first-child {
            min-height: 360px !important;
            height: 360px !important;
          }
        }
      `}</style>
    </div>
  );
}
