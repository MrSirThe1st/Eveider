'use client';

import { FilterToolbar } from '@eveider/ui';
import {
  DRIVER_OPERATIONAL_STATUS_LABELS,
  DRIVER_OPERATIONAL_STATUSES,
  type DriverOperationalStatus,
} from '@eveider/domain';

export type DriverStatusFilter = 'all' | DriverOperationalStatus;

type DriverStatusFiltersProps = {
  value: DriverStatusFilter;
  onChange: (value: DriverStatusFilter) => void;
};

const OPTIONS: { value: DriverStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  ...DRIVER_OPERATIONAL_STATUSES.map((status) => ({
    value: status as DriverStatusFilter,
    label: DRIVER_OPERATIONAL_STATUS_LABELS[status],
  })),
];

export function DriverStatusFilters({ value, onChange }: DriverStatusFiltersProps) {
  return (
    <FilterToolbar
      onClearAll={() => onChange('all')}
      filters={[
        {
          id: 'driver-status',
          label: 'Statut',
          value,
          emptyValue: 'all',
          options: OPTIONS,
          onChange: (next) => onChange(next as DriverStatusFilter),
        },
      ]}
    />
  );
}
