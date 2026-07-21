import type { CompartmentSize, CompartmentStatus, LockerStatus } from '@eveider/domain';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api/fetch-json';
import { STALE_TIMES } from '@/lib/query/stale-times';

export type CompartmentItem = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
};

export type LockerDetailData = {
  id: string;
  code: string;
  name: string;
  address: string;
  rows: number;
  columns: number;
  status: LockerStatus;
  compartmentCounts: {
    available: number;
    occupied: number;
    reserved: number;
    total: number;
  };
  compartments: CompartmentItem[];
};

function lockerDetailQueryKey(lockerId: string) {
  return ['lockers', lockerId] as const;
}

export function useLockerDetailQuery(lockerId: string) {
  return useQuery({
    queryKey: lockerDetailQueryKey(lockerId),
    queryFn: async () => {
      const data = await fetchJson<{ locker: LockerDetailData }>(`/api/lockers/${lockerId}`);
      return data.locker;
    },
    staleTime: STALE_TIMES.lockers,
  });
}

export { lockerDetailQueryKey };
