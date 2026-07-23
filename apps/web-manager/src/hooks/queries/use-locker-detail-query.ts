import type { CommissionType, CompartmentSize, CompartmentStatus, LockerStatus, LockerType } from '@eveider/domain';
import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';

export type CompartmentItem = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
  statusLabel?: string;
};

export type LockerDetailData = {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  rows: number;
  columns: number;
  type: LockerType;
  typeLabel: string;
  maxCapacity: number | null;
  contactPhone: string | null;
  contactName: string | null;
  notes: string | null;
  commissionType: CommissionType | null;
  commissionValue: number | null;
  commissionCurrency: string | null;
  occupyingCount: number;
  availableSlots: number;
  status: LockerStatus;
  statusLabel?: string;
  compartmentCounts: {
    available: number;
    occupied: number;
    reserved: number;
    total: number;
  };
  compartments: CompartmentItem[];
};

export async function fetchLockerDetail(lockerId: string): Promise<LockerDetailData> {
  const data = await fetchJson<{ locker: LockerDetailData }>(`/api/lockers/${lockerId}`);
  return data.locker;
}

export function useLockerDetailQuery(lockerId: string) {
  const [data, setData] = useState<LockerDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const locker = await fetchLockerDetail(lockerId);
      setData(locker);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Impossible de charger le point.'));
    } finally {
      setIsLoading(false);
    }
  }, [lockerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    setData,
    isLoading,
    isError: error !== null,
    error,
    refetch: load,
  };
}
