import type { ParcelStatusFilter } from '@eveider/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { fetchJson } from '@/lib/api/fetch-json';

function adminParcelsUrl(status: ParcelStatusFilter, search?: string) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  const query = params.toString();
  return query ? `/api/parcels?${query}` : '/api/parcels';
}

export async function fetchAdminParcels(
  status: ParcelStatusFilter,
  search?: string,
): Promise<DashboardParcelItem[]> {
  const data = await fetchJson<{ parcels: DashboardParcelItem[] }>(adminParcelsUrl(status, search));
  return data.parcels;
}

type UseAdminParcelsQueryOptions = {
  enabled?: boolean;
  initialData?: DashboardParcelItem[];
  search?: string;
};

export function useAdminParcelsQuery(
  status: ParcelStatusFilter,
  options?: UseAdminParcelsQueryOptions,
) {
  const enabled = options?.enabled ?? true;
  const search = options?.search ?? '';
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
      const next = await fetchAdminParcels(status, search);
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
  }, [enabled, search, status]);

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

    if (options?.initialData !== undefined && !search) {
      requestIdRef.current += 1;
      setParcels(options.initialData);
      hasDataRef.current = true;
      setIsLoading(false);
      setIsFetching(false);
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
