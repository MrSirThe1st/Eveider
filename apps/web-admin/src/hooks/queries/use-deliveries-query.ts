import type { DeliveryStatus } from '@eveider/domain';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api/fetch-json';
import { businessesQueryKey } from '@/hooks/queries/use-businesses-query';
import type { BusinessListItem } from '@/hooks/queries/use-businesses-query';
import { couriersQueryKey, type CourierListItem } from '@/hooks/queries/use-couriers-query';
import type { LockerListItem } from '@/hooks/queries/use-lockers-query';
import { lockersQueryKey } from '@/hooks/queries/use-lockers-query';
import { REFRESH_INTERVALS, STALE_TIMES } from '@/lib/query/stale-times';

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
    reference: string;
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

function deliveriesQueryKey(filters: DeliveryFilters) {
  return ['deliveries', filters] as const;
}

function deliveriesBoardQueryKey(filters: DeliveryFilters) {
  return ['deliveries-board', filters] as const;
}

function buildDeliveriesUrl(filters: DeliveryFilters) {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.courierId) params.set('courierId', filters.courierId);
  if (filters.lockerId) params.set('lockerId', filters.lockerId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  const query = params.toString();
  return query ? `/api/deliveries?${query}` : '/api/deliveries';
}

function buildDeliveriesBoardUrl(filters: DeliveryFilters) {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.courierId) params.set('courierId', filters.courierId);
  if (filters.lockerId) params.set('lockerId', filters.lockerId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  const query = params.toString();
  return query ? `/api/deliveries/board?${query}` : '/api/deliveries/board';
}

export function useDeliveriesQuery(filters: DeliveryFilters) {
  return useQuery({
    queryKey: deliveriesQueryKey(filters),
    queryFn: () => fetchJson<DeliveriesResponse>(buildDeliveriesUrl(filters)),
    staleTime: STALE_TIMES.deliveries,
    refetchInterval: REFRESH_INTERVALS.deliveries,
    placeholderData: keepPreviousData,
  });
}

/** Livraisons screen — one request for deliveries + filter dropdown data. */
export function useDeliveriesBoardQuery(filters: DeliveryFilters) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: deliveriesBoardQueryKey(filters),
    queryFn: async () => {
      const data = await fetchJson<DeliveriesBoardResponse>(buildDeliveriesBoardUrl(filters));

      queryClient.setQueryData(couriersQueryKey(), data.couriers);
      queryClient.setQueryData(lockersQueryKey(), data.lockers);
      queryClient.setQueryData(businessesQueryKey(), data.businesses);

      return data;
    },
    staleTime: STALE_TIMES.deliveries,
    refetchInterval: REFRESH_INTERVALS.deliveries,
    placeholderData: keepPreviousData,
  });
}

export { deliveriesBoardQueryKey, deliveriesQueryKey };
