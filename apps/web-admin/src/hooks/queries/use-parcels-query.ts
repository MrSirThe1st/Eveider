import type { ParcelStatus } from '@eveider/domain';
import type { ParcelStatusFilter } from '@eveider/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api/fetch-json';
import type { DashboardParcelItem } from '@/components/admin-dashboard-types';
import { STALE_TIMES } from '@/lib/query/stale-times';

export type BusinessParcelItem = {
  id: string;
  reference: string;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  locker: { name: string; address: string } | null;
  createdAt: string;
};

type ParcelsScope = 'business' | 'admin';

function parcelsQueryKey(scope: ParcelsScope, status: ParcelStatusFilter) {
  return ['parcels', scope, { status }] as const;
}

function parcelsUrl(scope: ParcelsScope, status: ParcelStatusFilter) {
  const base = scope === 'business' ? '/api/entreprise/parcels' : '/api/parcels';
  const query = status === 'all' ? '' : `?status=${status}`;
  return `${base}${query}`;
}

async function fetchBusinessParcels(status: ParcelStatusFilter) {
  const data = await fetchJson<{ parcels: BusinessParcelItem[] }>(parcelsUrl('business', status));
  return data.parcels;
}

async function fetchAdminParcels(status: ParcelStatusFilter) {
  const data = await fetchJson<{ parcels: DashboardParcelItem[] }>(parcelsUrl('admin', status));
  return data.parcels;
}

export function useBusinessParcelsQuery(status: ParcelStatusFilter) {
  return useQuery({
    queryKey: parcelsQueryKey('business', status),
    queryFn: () => fetchBusinessParcels(status),
    staleTime: STALE_TIMES.parcels,
    placeholderData: keepPreviousData,
  });
}

export function useAdminParcelsQuery(
  status: ParcelStatusFilter,
  options?: { enabled?: boolean; initialData?: DashboardParcelItem[] },
) {
  return useQuery({
    queryKey: parcelsQueryKey('admin', status),
    queryFn: () => fetchAdminParcels(status),
    staleTime: STALE_TIMES.parcels,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
  });
}

export { parcelsQueryKey };
