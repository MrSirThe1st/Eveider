import type { DeliveryStatus } from '@eveider/domain';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, type ColorTokens } from '@eveider/config-ui';
import { useColors } from '../theme';

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColors: Record<DeliveryStatus, string> = {
    assigned: colors.border,
    scanned: colors.info,
    drop_off_pending: colors.warning,
    completed: colors.primary,
    failed: colors.danger,
  };

  return (
    <View style={[styles.badge, { backgroundColor: statusColors[status] }]}>
      <Text style={styles.label}>{DELIVERY_STATUS_LABELS[status]}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.button,
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.onPrimary,
    },
  });
}
