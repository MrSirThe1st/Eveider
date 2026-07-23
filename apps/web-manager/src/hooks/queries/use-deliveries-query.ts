import type { DeliveryStatus } from '@eveider/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BusinessListItem } from '@/hooks/queries/use-businesses-query';
import type { CourierListItem } from '@/hooks/queries/use-couriers-query';
import type { LockerListItem } from '@/hooks/queries/use-lockers-query';
import { fetchJson } from '@/lib/api/fetch-json';

export const DELIVERIES_REFRESH_MS = 30_000;

export type DeliveryStatusFilter = 'all' | DeliveryStatus;

export type DeliveryFilters = {
  status: DeliveryStatusFilter;
  courierId: string;
  lockerId: string;
  businessId: string;
};

export type DeliveryItem = {
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
    trackingNumber: string;
    reference: string | null;
    recipientName: string | null;
    recipientPhone: string;
    business: { id: string; name: string };
    locker: { id: string; name: string; address: string } | null;
  };
};

export type DeliverySummary = {
  assigned: number;
  scanned: number;
  drop_off_pending: number;
  total: number;
};

type DeliveriesResponse = {
  deliveries: DeliveryItem[];
  summary: DeliverySummary;
};

export type DeliveriesBoardResponse = DeliveriesResponse & {
  couriers: CourierListItem[];
  lockers: LockerListItem[];
  businesses: BusinessListItem[];
};

function buildDeliveriesBoardUrl(filters: DeliveryFilters) {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.courierId) params.set('courierId', filters.courierId);
  if (filters.lockerId) params.set('lockerId', filters.lockerId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  const query = params.toString();
  return query ? `/api/deliveries/board?${query}` : '/api/deliveries/board';
}

export async function fetchDeliveriesBoard(filters: DeliveryFilters): Promise<DeliveriesBoardResponse> {
  return fetchJson<DeliveriesBoardResponse>(buildDeliveriesBoardUrl(filters));
}

/** Livraisons screen — one request for deliveries + filter dropdown data. */
export function useDeliveriesBoardQuery(filters: DeliveryFilters) {
  const [data, setData] = useState<DeliveriesBoardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState(0);
  const hasDataRef = useRef(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const isInitial = !hasDataRef.current;
      if (isInitial && !opts?.silent) {
        setIsLoading(true);
      } else if (!isInitial) {
        setIsFetching(true);
      }
      setError(null);

      try {
        const next = await fetchDeliveriesBoard(filters);
        setData(next);
        setDataUpdatedAt(Date.now());
        hasDataRef.current = true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Impossible de charger les livraisons.'));
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [filters.status, filters.courierId, filters.lockerId, filters.businessId],
  );

  useEffect(() => {
    hasDataRef.current = false;
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void load({ silent: true });
    }, DELIVERIES_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [load]);

  return {
    data,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    dataUpdatedAt,
    refetch: () => load(),
  };
}
