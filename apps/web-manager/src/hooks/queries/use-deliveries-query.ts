import type { DeliveryStatus, ParcelStatus } from '@eveider/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BusinessListItem } from '@/hooks/queries/use-businesses-query';
import type { CourierListItem } from '@/hooks/queries/use-couriers-query';
import type { LockerListItem } from '@/hooks/queries/use-lockers-query';
import { fetchJson } from '@/lib/api/fetch-json';

export const DELIVERIES_REFRESH_MS = 30_000;

export type DeliveryBoardView = 'active' | 'au_casier' | 'collected' | 'all';
export type DeliveryStatusFilter = 'all' | DeliveryStatus;

export type DeliveryFilters = {
  view: DeliveryBoardView;
  status: DeliveryStatusFilter;
  courierId: string;
  lockerId: string;
  businessId: string;
  search: string;
};

export type DeliveryBoardItem = {
  id: string;
  kind: 'delivery' | 'parcel';
  status: DeliveryStatus | ParcelStatus | string;
  statusLabel: string;
  updatedAt: string;
  courier: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    recipientPhone: string;
    business: { id: string; name: string };
    locker: { id: string; name: string; code: string; address: string } | null;
    compartment: { label: string; size: string } | null;
  };
};

export type DeliverySummary = {
  assigned: number;
  scanned: number;
  drop_off_pending: number;
  total: number;
};

export type DeliveriesBoardResponse = {
  view: DeliveryBoardView;
  items: DeliveryBoardItem[];
  summary: DeliverySummary | null;
  couriers: CourierListItem[];
  lockers: LockerListItem[];
  businesses: BusinessListItem[];
};

type LoadOptions = {
  silent?: boolean;
  /** Full load includes filter catalogs; silent refresh skips them. */
  includeMeta?: boolean;
};

function buildDeliveriesBoardUrl(filters: DeliveryFilters, includeMeta: boolean) {
  const params = new URLSearchParams();
  params.set('view', filters.view);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.courierId) params.set('courierId', filters.courierId);
  if (filters.lockerId) params.set('lockerId', filters.lockerId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (!includeMeta) params.set('includeMeta', '0');
  return `/api/deliveries/board?${params.toString()}`;
}

export async function fetchDeliveriesBoard(
  filters: DeliveryFilters,
  options?: { includeMeta?: boolean },
): Promise<DeliveriesBoardResponse> {
  const includeMeta = options?.includeMeta ?? true;
  return fetchJson<DeliveriesBoardResponse>(buildDeliveriesBoardUrl(filters, includeMeta));
}

function mergeBoardResponse(
  previous: DeliveriesBoardResponse | null,
  next: DeliveriesBoardResponse,
  includeMeta: boolean,
): DeliveriesBoardResponse {
  if (includeMeta || !previous) return next;
  return {
    ...next,
    couriers: previous.couriers,
    lockers: previous.lockers,
    businesses: previous.businesses,
  };
}

export function useDeliveriesBoardQuery(filters: DeliveryFilters) {
  const [data, setData] = useState<DeliveriesBoardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState(0);
  const hasDataRef = useRef(false);
  const dataRef = useRef<DeliveriesBoardResponse | null>(null);

  const load = useCallback(async (opts?: LoadOptions) => {
    const includeMeta = opts?.includeMeta ?? true;
    const isInitial = !hasDataRef.current;
    if (isInitial && !opts?.silent) {
      setIsLoading(true);
    } else if (!isInitial) {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchDeliveriesBoard(filters, { includeMeta });
      const merged = mergeBoardResponse(dataRef.current, next, includeMeta);
      dataRef.current = merged;
      setData(merged);
      setDataUpdatedAt(Date.now());
      hasDataRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Impossible de charger les livraisons.'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [
    filters.view,
    filters.status,
    filters.courierId,
    filters.lockerId,
    filters.businessId,
    filters.search,
  ]);

  useEffect(() => {
    hasDataRef.current = false;
    dataRef.current = null;
    void load({ includeMeta: true });
  }, [load]);

  useEffect(() => {
    if (filters.view !== 'active') return undefined;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refreshSilent = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load({ silent: true, includeMeta: false });
    };

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(refreshSilent, DELIVERIES_REFRESH_MS);
    };

    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSilent();
        start();
        return;
      }
      stop();
    };

    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [filters.view, load]);

  return {
    data,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    dataUpdatedAt,
    refetch: () => load({ includeMeta: true }),
  };
}
