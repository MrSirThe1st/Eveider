'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { FilterBar, FilterChipGroup } from '@eveider/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { FlashBanner } from '@/components/flash-banner';

const REFRESH_MS = 30_000;

type DeliveryStatusFilter = 'all' | DeliveryStatus;

type DeliveryItem = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  updatedAt: string;
  courier: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  parcel: {
    id: string;
    reference: string;
    recipientName: string | null;
    recipientPhone: string;
    business: { id: string; name: string };
    locker: { id: string; name: string; address: string } | null;
  };
};

type DeliverySummary = {
  assigned: number;
  scanned: number;
  drop_off_pending: number;
  total: number;
};

type FilterOption = { id: string; label: string };

type DeliveryFilters = {
  status: DeliveryStatusFilter;
  courierId: string;
  lockerId: string;
  businessId: string;
};

const STATUS_FILTERS: { value: DeliveryStatusFilter; label: string }[] = [
  { value: 'all', label: 'ACTIVES' },
  { value: 'assigned', label: DELIVERY_STATUS_LABELS.assigned },
  { value: 'scanned', label: DELIVERY_STATUS_LABELS.scanned },
  { value: 'drop_off_pending', label: DELIVERY_STATUS_LABELS.drop_off_pending },
];

const selectStyle: React.CSSProperties = {
  minWidth: 180,
  height: spacing.buttonHeight,
  padding: '0 0.75rem',
  border: `2px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
  background: colors.surface,
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function courierLabel(courier: DeliveryItem['courier']) {
  return courier.fullName ?? courier.email ?? courier.phone ?? 'Coursier';
}

function buildQuery(filters: DeliveryFilters) {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.courierId) params.set('courierId', filters.courierId);
  if (filters.lockerId) params.set('lockerId', filters.lockerId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function AdminLiveDeliveryBoard() {
  const [filters, setFilters] = useState<DeliveryFilters>({
    status: 'all',
    courierId: '',
    lockerId: '',
    businessId: '',
  });
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [couriers, setCouriers] = useState<FilterOption[]>([]);
  const [lockers, setLockers] = useState<FilterOption[]>([]);
  const [businesses, setBusinesses] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [couriersRes, lockersRes, businessesRes] = await Promise.all([
        fetch('/api/couriers', { cache: 'no-store' }),
        fetch('/api/lockers', { cache: 'no-store' }),
        fetch('/api/businesses', { cache: 'no-store' }),
      ]);

      const [couriersData, lockersData, businessesData] = await Promise.all([
        couriersRes.json(),
        lockersRes.json(),
        businessesRes.json(),
      ]);

      if (couriersData.success) {
        setCouriers(
          couriersData.data.couriers.map((c: { id: string; fullName: string | null; email: string | null }) => ({
            id: c.id,
            label: c.fullName ?? c.email ?? c.id,
          })),
        );
      }

      if (lockersData.success) {
        setLockers(
          lockersData.data.lockers.map((l: { id: string; name: string }) => ({
            id: l.id,
            label: l.name,
          })),
        );
      }

      if (businessesData.success) {
        setBusinesses(
          businessesData.data.businesses.map((b: { id: string; name: string }) => ({
            id: b.id,
            label: b.name,
          })),
        );
      }
    } catch {
      /* filter options are optional */
    }
  }, []);

  const loadDeliveries = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/deliveries${buildQuery(filters)}`, { cache: 'no-store' });
        const result = await response.json();

        if (!result.success) {
          setError(result.error ?? 'Chargement échoué');
          setDeliveries([]);
          setSummary(null);
          return;
        }

        setDeliveries(result.data.deliveries);
        setSummary(result.data.summary);
        setLastRefresh(new Date());
      } catch {
        setError('Impossible de charger les livraisons.');
        setDeliveries([]);
        setSummary(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDeliveries(true);
    }, REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [loadDeliveries]);

  const summaryCards = useMemo(
    () => [
      { key: 'assigned' as const, label: DELIVERY_STATUS_LABELS.assigned, value: summary?.assigned ?? 0 },
      { key: 'scanned' as const, label: DELIVERY_STATUS_LABELS.scanned, value: summary?.scanned ?? 0 },
      {
        key: 'drop_off_pending' as const,
        label: DELIVERY_STATUS_LABELS.drop_off_pending,
        value: summary?.drop_off_pending ?? 0,
      },
    ],
    [summary],
  );

  function updateFilter<K extends keyof DeliveryFilters>(key: K, value: DeliveryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => updateFilter('status', filters.status === card.key ? 'all' : card.key)}
            style={{
              textAlign: 'left',
              padding: '1rem 1.25rem',
              background: filters.status === card.key ? '#E8FCE8' : colors.surface,
              border: `1px solid ${filters.status === card.key ? colors.primary : colors.border}`,
              borderRadius: radius.card,
              cursor: 'pointer',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              {card.label}
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{card.value}</p>
          </button>
        ))}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radius.card,
          }}
        >
          <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' }}>
            TOTAL ACTIF
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{summary?.total ?? 0}</p>
        </div>
      </div>

      <FilterBar label="FILTRER PAR STATUT">
        <FilterChipGroup
          items={STATUS_FILTERS}
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
        />
      </FilterBar>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
        }}
      >
        <select
          value={filters.courierId}
          onChange={(event) => updateFilter('courierId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par coursier"
        >
          <option value="">Tous les coursiers</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>
              {courier.label}
            </option>
          ))}
        </select>

        <select
          value={filters.lockerId}
          onChange={(event) => updateFilter('lockerId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par casier"
        >
          <option value="">Tous les casiers</option>
          {lockers.map((locker) => (
            <option key={locker.id} value={locker.id}>
              {locker.label}
            </option>
          ))}
        </select>

        <select
          value={filters.businessId}
          onChange={(event) => updateFilter('businessId', event.target.value)}
          style={selectStyle}
          aria-label="Filtrer par entreprise"
        >
          <option value="">Toutes les entreprises</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.label}
            </option>
          ))}
        </select>

        {lastRefresh ? (
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: colors.secondary, opacity: 0.7 }}>
            Actualisé à {formatDateTime(lastRefresh.toISOString())} · auto 30s
          </span>
        ) : null}
      </div>

      {loading ? <p style={{ fontWeight: 500 }}>Chargement des livraisons…</p> : null}

      {!loading && error ? (
        <div>
          <FlashBanner message={error} variant="error" />
          <button
            type="button"
            onClick={() => void loadDeliveries()}
            style={{
              marginTop: '1rem',
              height: spacing.buttonHeight,
              padding: '0 1.25rem',
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              cursor: 'pointer',
              background: colors.surface,
            }}
          >
            RÉESSAYER
          </button>
        </div>
      ) : null}

      {!loading && !error && deliveries.length === 0 ? (
        <p style={{ fontWeight: 500, color: colors.secondary, opacity: 0.8 }}>
          Aucune livraison active pour ces filtres.
        </p>
      ) : null}

      {!loading && !error && deliveries.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr>
                {['COLIS', 'STATUT', 'COURSIER', 'ENTREPRISE', 'CASIER', 'DESTINATAIRE', 'MAJ', ''].map(
                  (heading) => (
                    <th
                      key={heading || 'actions'}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        borderBottom: `2px solid ${colors.border}`,
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}` }}>
                    <Link
                      href={`/tableau-de-bord/colis/${delivery.parcel.id}`}
                      style={{ fontWeight: 700, color: colors.secondary, textDecoration: 'none' }}
                    >
                      {delivery.parcel.reference}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}` }}>
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}` }}>
                    <Link
                      href={`/tableau-de-bord/utilisateurs/${delivery.courier.id}`}
                      style={{ fontWeight: 500, color: colors.secondary, textDecoration: 'none' }}
                    >
                      {courierLabel(delivery.courier)}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}`, fontWeight: 500 }}>
                    {delivery.parcel.business.name}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}`, fontWeight: 500 }}>
                    {delivery.parcel.locker ? (
                      <Link
                        href={`/tableau-de-bord/casiers/${delivery.parcel.locker.id}`}
                        style={{ color: colors.secondary, textDecoration: 'none' }}
                      >
                        {delivery.parcel.locker.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}`, fontWeight: 500 }}>
                    {delivery.parcel.recipientName ?? '—'}
                    <br />
                    <span style={{ fontSize: '0.8125rem', opacity: 0.75 }}>{delivery.parcel.recipientPhone}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}`, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatDateTime(delivery.updatedAt)}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', borderBottom: `2px solid ${colors.border}` }}>
                    <Link
                      href={`/tableau-de-bord/colis/${delivery.parcel.id}`}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: colors.secondary,
                      }}
                    >
                      DÉTAIL →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
