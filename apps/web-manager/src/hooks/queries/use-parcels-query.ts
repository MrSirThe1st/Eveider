import type { ParcelStatus } from '@eveider/domain';
import type { ParcelStatusFilter } from '@eveider/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { fetchJson } from '@/lib/api/fetch-json';

export type BusinessParcelItem = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  locker: { name: string; address: string } | null;
  createdAt: string;
};

type ParcelsScope = 'business' | 'admin';

function parcelsUrl(scope: ParcelsScope, status: ParcelStatusFilter, search?: string) {
  const base = scope === 'business' ? '/api/entreprise/parcels' : '/api/parcels';
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export async function fetchBusinessParcels(
  status: ParcelStatusFilter,
  search?: string,
): Promise<BusinessParcelItem[]> {
  const data = await fetchJson<{ parcels: BusinessParcelItem[] }>(
    parcelsUrl('business', status, search),
  );
  return data.parcels;
}

export async function fetchAdminParcels(
  status: ParcelStatusFilter,
  search?: string,
): Promise<DashboardParcelItem[]> {
  const data = await fetchJson<{ parcels: DashboardParcelItem[] }>(
    parcelsUrl('admin', status, search),
  );
  return data.parcels;
}

export function useBusinessParcelsQuery(status: ParcelStatusFilter, search = '') {
  const [parcels, setParcels] = useState<BusinessParcelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasDataRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!hasDataRef.current) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchBusinessParcels(status, search);
      if (requestId !== requestIdRef.current) return;
      setParcels(next);
      hasDataRef.current = true;
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e : new Error('Impossible de charger les colis.'));
    } finally {
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data: parcels,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    refetch: load,
  };
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
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
      setIsFetching(false);
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
