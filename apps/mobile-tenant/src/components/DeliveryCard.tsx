import { colors, radius, borders } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

type DeliveryCardProps = {
  delivery: CourierDelivery;
  highlight?: boolean;
};

const ACTION_STATUSES: DeliveryStatus[] = ['assigned', 'scanned', 'drop_off_pending'];

export function DeliveryCard({ delivery, highlight }: DeliveryCardProps) {
  const needsAction = ACTION_STATUSES.includes(delivery.status);
  const showHighlight = highlight ?? needsAction;

  return (
    <View
      style={[
        styles.card,
        showHighlight && delivery.status === 'assigned' && styles.highlightWarning,
        showHighlight && delivery.status !== 'assigned' && styles.highlightAction,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.reference}>{delivery.parcel.trackingNumber ?? delivery.parcel.reference}</Text>
        <DeliveryStatusBadge status={delivery.status} />
      </View>
      <Text style={styles.meta}>{delivery.parcel.businessName}</Text>
      <Text style={styles.locker}>
        {delivery.parcel.locker?.name ?? 'Casier non défini'}
      </Text>
      {needsAction ? (
        <Text style={styles.actionHint}>
          {delivery.status === 'assigned'
            ? 'SCAN REQUIS'
            : delivery.status === 'scanned'
              ? 'EN ROUTE VERS LE CASIER'
              : 'CONFIRMER LE DÉPÔT'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  highlightAction: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  highlightWarning: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reference: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  meta: {
    marginTop: 8,
    fontWeight: '500',
    color: colors.secondary,
  },
  locker: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
  },
  actionHint: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.warning,
  },
});
