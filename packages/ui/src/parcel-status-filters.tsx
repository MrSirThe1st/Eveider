'use client';

import { PARCEL_STATUSES, PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { FilterToolbar } from './filter-toolbar.js';

export type ParcelStatusFilter = 'all' | ParcelStatus;

type ParcelStatusFiltersProps = {
  value: ParcelStatusFilter;
  onChange: (value: ParcelStatusFilter) => void;
};

const STATUS_OPTIONS: { value: ParcelStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  ...PARCEL_STATUSES.map((status: ParcelStatus) => ({
    value: status as ParcelStatusFilter,
    label: PARCEL_STATUS_LABELS[status],
  })),
];

export function ParcelStatusFilters({ value, onChange }: ParcelStatusFiltersProps) {
  return (
    <FilterToolbar
      onClearAll={() => onChange('all')}
      filters={[
        {
          id: 'parcel-status',
          label: 'Statut',
          value,
          emptyValue: 'all',
          options: STATUS_OPTIONS,
          onChange: (next) => onChange(next as ParcelStatusFilter),
        },
      ]}
    />
  );
}
