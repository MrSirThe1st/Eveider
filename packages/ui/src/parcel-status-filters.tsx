'use client';

import { PARCEL_STATUSES, PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { FilterBar, FilterChipGroup } from './filter-bar.js';

export type ParcelStatusFilter = 'all' | ParcelStatus;

type ParcelStatusFiltersProps = {
  value: ParcelStatusFilter;
  onChange: (value: ParcelStatusFilter) => void;
};

const FILTER_ITEMS: { value: ParcelStatusFilter; label: string }[] = [
  { value: 'all', label: 'TOUS' },
  ...PARCEL_STATUSES.map((status: ParcelStatus) => ({
    value: status as ParcelStatusFilter,
    label: PARCEL_STATUS_LABELS[status],
  })),
];

export function ParcelStatusFilters({ value, onChange }: ParcelStatusFiltersProps) {
  return (
    <FilterBar label="FILTRER PAR STATUT">
      <FilterChipGroup items={FILTER_ITEMS} value={value} onChange={onChange} />
    </FilterBar>
  );
}
