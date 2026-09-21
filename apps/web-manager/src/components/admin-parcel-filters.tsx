'use client';

import { FilterToolbar } from '@eveider/ui';
import {
  ADMIN_PARCEL_ATTENTION_FILTERS,
  type AdminParcelAttentionFilter,
} from '@/lib/admin-presentation';

type AdminParcelFiltersProps = {
  attention: AdminParcelAttentionFilter;
  pickupType: 'all' | 'courier_pickup' | 'merchant_dropoff';
  onAttentionChange: (value: AdminParcelAttentionFilter) => void;
  onPickupTypeChange: (value: 'all' | 'courier_pickup' | 'merchant_dropoff') => void;
};

export function AdminParcelFilters({
  attention,
  pickupType,
  onAttentionChange,
  onPickupTypeChange,
}: AdminParcelFiltersProps) {
  return (
    <FilterToolbar
      embedded
      onClearAll={() => {
        onAttentionChange('all');
        onPickupTypeChange('all');
      }}
      filters={[
        {
          id: 'attention',
          label: 'État',
          value: attention,
          emptyValue: 'all',
          options: ADMIN_PARCEL_ATTENTION_FILTERS,
          onChange: (next) => onAttentionChange(next as AdminParcelAttentionFilter),
        },
        {
          id: 'method',
          label: 'Méthode',
          value: pickupType,
          emptyValue: 'all',
          options: [
            { value: 'all', label: 'Toutes' },
            { value: 'courier_pickup', label: 'Collecte Eveider' },
            { value: 'merchant_dropoff', label: 'Dépôt au casier' },
          ],
          onChange: (next) =>
            onPickupTypeChange(next as 'all' | 'courier_pickup' | 'merchant_dropoff'),
        },
      ]}
    />
  );
}
