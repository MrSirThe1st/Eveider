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

function parcelsUrl(scope: ParcelsScope, status: ParcelStatusFilter) {
  const base = scope === 'business' ? '/api/entreprise/parcels' : '/api/parcels';
  const query = status === 'all' ? '' : `?status=${status}`;
  return `${base}${query}`;
}

export async function fetchBusinessParcels(status: ParcelStatusFilter): Promise<BusinessParcelItem[]> {
  const data = await fetchJson<{ parcels: BusinessParcelItem[] }>(parcelsUrl('business', status));
  return data.parcels;
}

export async function fetchAdminParcels(status: ParcelStatusFilter): Promise<DashboardParcelItem[]> {
  const data = await fetchJson<{ parcels: DashboardParcelItem[] }>(parcelsUrl('admin', status));
  return data.parcels;
}

export function useBusinessParcelsQuery(status: ParcelStatusFilter) {
  const [parcels, setParcels] = useState<BusinessParcelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasDataRef.current;
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchBusinessParcels(status);
      setParcels(next);
      hasDataRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Impossible de charger les colis.'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [status]);

  useEffect(() => {
    hasDataRef.current = false;
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
};

export function useAdminParcelsQuery(
  status: ParcelStatusFilter,
  options?: UseAdminParcelsQueryOptions,
) {
  const enabled = options?.enabled ?? true;
  const [parcels, setParcels] = useState<DashboardParcelItem[]>(options?.initialData ?? []);
  const [isLoading, setIsLoading] = useState(enabled && options?.initialData === undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasDataRef = useRef(options?.initialData !== undefined);

  const load = useCallback(async () => {
    if (!enabled) return;

    const isInitial = !hasDataRef.current;
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchAdminParcels(status);
      setParcels(next);
      hasDataRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Impossible de charger les colis.'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled, status]);

  useEffect(() => {
    if (!enabled) {
      if (options?.initialData !== undefined) {
        setParcels(options.initialData);
        hasDataRef.current = true;
        setIsLoading(false);
      }
      return;
    }

    hasDataRef.current = options?.initialData !== undefined;
    if (options?.initialData !== undefined) {
      setParcels(options.initialData);
      setIsLoading(false);
      return;
    }

    void load();
  }, [enabled, load, options?.initialData]);

  return {
    data: parcels,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    refetch: load,
  };
}
