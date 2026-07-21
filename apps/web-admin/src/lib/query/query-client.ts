import { QueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/query/stale-times';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.parcels,
        gcTime: 10 * 60_000,
        retry: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}
