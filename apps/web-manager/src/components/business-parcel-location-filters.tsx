'use client';

import {
  BUSINESS_PARCEL_LOCATION_LABELS,
  BUSINESS_PARCEL_LOCATIONS,
  type BusinessParcelLocation,
} from '@eveider/domain';
import { FilterToolbar } from '@eveider/ui';

export type BusinessParcelLocationFilter = 'all' | BusinessParcelLocation;

type BusinessParcelLocationFiltersProps = {
  value: BusinessParcelLocationFilter;
  onChange: (value: BusinessParcelLocationFilter) => void;
};

const LOCATION_OPTIONS: { value: BusinessParcelLocationFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  ...BUSINESS_PARCEL_LOCATIONS.map((location) => ({
    value: location as BusinessParcelLocationFilter,
    label: BUSINESS_PARCEL_LOCATION_LABELS[location],
  })),
];

export function BusinessParcelLocationFilters({
  value,
  onChange,
}: BusinessParcelLocationFiltersProps) {
  return (
    <FilterToolbar
      onClearAll={() => onChange('all')}
      filters={[
        {
          id: 'parcel-location',
          label: 'Situation',
          value,
          emptyValue: 'all',
          options: LOCATION_OPTIONS,
          onChange: (next) => onChange(next as BusinessParcelLocationFilter),
        },
      ]}
    />
  );
}
