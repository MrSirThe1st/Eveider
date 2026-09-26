'use client';

import { FilterToolbar } from '@eveider/ui';
import {
  BUSINESS_PARCEL_ATTENTION_FILTERS,
  type BusinessParcelAttentionFilter,
} from '@/lib/business-presentation';
import { useOperationalBadges } from '@/components/operational-badges-context';

type BusinessParcelFiltersProps = {
  attention: BusinessParcelAttentionFilter;
  pickupType: 'all' | 'courier_pickup' | 'merchant_dropoff';
  onAttentionChange: (value: BusinessParcelAttentionFilter) => void;
  onPickupTypeChange: (value: 'all' | 'courier_pickup' | 'merchant_dropoff') => void;
};

export function BusinessParcelFilters({
  attention,
  pickupType,
  onAttentionChange,
  onPickupTypeChange,
}: BusinessParcelFiltersProps) {
  const badges = useOperationalBadges().business;

  const attentionOptions = BUSINESS_PARCEL_ATTENTION_FILTERS.map((option) => {
    if (option.value === 'awaiting_handoff') {
      return { ...option, count: badges?.awaitingHandoff };
    }
    if (option.value === 'awaiting_deposit') {
      return { ...option, count: badges?.awaitingDeposit };
    }
    if (option.value === 'returns') {
      const count = (badges?.returnsToReview ?? 0) + (badges?.returnsToCollect ?? 0);
      return { ...option, count: count > 0 ? count : undefined };
    }
    return option;
  });

  return (
    <FilterToolbar
      style={{ marginBottom: 0 }}
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
          options: attentionOptions,
          onChange: (next) => onAttentionChange(next as BusinessParcelAttentionFilter),
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
