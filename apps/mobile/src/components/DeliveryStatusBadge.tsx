import type { DeliveryStatus } from '@eveider/domain';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@eveider/config-ui';

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  assigned: colors.border,
  scanned: '#D4E157',
  drop_off_pending: '#FFB74D',
  completed: colors.primary,
  failed: colors.danger,
};

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]}>
      <Text style={styles.label}>{DELIVERY_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.button,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
});
