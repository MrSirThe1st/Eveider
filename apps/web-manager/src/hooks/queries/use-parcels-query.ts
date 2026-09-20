import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { fetchJson } from '@/lib/api/fetch-json';
import type { AdminParcelAttentionFilter } from '@/lib/admin-presentation';

export type AdminParcelListFilters = {
  attention: AdminParcelAttentionFilter;
  pickupType: 'all' | 'courier_pickup' | 'merchant_dropoff';
  search?: string;
};

function adminParcelsUrl(filters: AdminParcelListFilters) {
  const params = new URLSearchParams();
  if (filters.attention !== 'all') params.set('attention', filters.attention);
  if (filters.pickupType !== 'all') params.set('pickupType', filters.pickupType);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  const query = params.toString();
  return query ? `/api/parcels?${query}` : '/api/parcels';
}

export async function fetchAdminParcels(
  filters: AdminParcelListFilters,
): Promise<DashboardParcelItem[]> {
  const data = await fetchJson<{ parcels: DashboardParcelItem[] }>(adminParcelsUrl(filters));
  return data.parcels;
}

type UseAdminParcelsQueryOptions = {
  enabled?: boolean;
  initialData?: DashboardParcelItem[];
};

export function useAdminParcelsQuery(
  filters: AdminParcelListFilters,
  options?: UseAdminParcelsQueryOptions,
) {
  const enabled = options?.enabled ?? true;
  const search = filters.search ?? '';
  const [parcels, setParcels] = useState<DashboardParcelItem[]>(options?.initialData ?? []);
  const [isLoading, setIsLoading] = useState(enabled && options?.initialData === undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasDataRef = useRef(options?.initialData !== undefined);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    if (!hasDataRef.current) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchAdminParcels(filters);
      if (requestId !== requestIdRef.current) return;
      setParcels(next);
      hasDataRef.current = true;
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e : new Error('Impossible de charger les colis.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [enabled, filters.attention, filters.pickupType, filters.search]);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      if (options?.initialData !== undefined) {
        setParcels(options.initialData);
        hasDataRef.current = true;
        setIsLoading(false);
        setIsFetching(false);
      }
      return;
    }

    void load();
  }, [enabled, load, options?.initialData, search]);

  return {
    data: parcels,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    refetch: load,
  };
}
