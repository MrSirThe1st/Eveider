import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api/fetch-json';
import { STALE_TIMES } from '@/lib/query/stale-times';

export type CourierListItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

export function couriersQueryKey() {
  return ['couriers'] as const;
}

export function useCouriersQuery() {
  return useQuery({
    queryKey: couriersQueryKey(),
    queryFn: async () => {
      const data = await fetchJson<{ couriers: CourierListItem[] }>('/api/couriers');
      return data.couriers;
    },
    staleTime: STALE_TIMES.couriers,
  });
}
