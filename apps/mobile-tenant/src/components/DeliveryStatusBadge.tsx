import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { DELIVERY_STATUS_LABELS } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const active = status === 'scanned' || status === 'drop_off_pending';
  const done = status === 'completed';
  const failed = status === 'failed';

  return (
    <View
      style={[
        styles.badge,
        active && styles.badgeActive,
        done && styles.badgeDone,
        failed && styles.badgeFailed,
      ]}
    >
      <Text
        style={[
          styles.text,
          active && styles.textActive,
          done && styles.textDone,
          failed && styles.textFailed,
        ]}
      >
        {DELIVERY_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    badge: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.badge,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.background,
    },
    badgeActive: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    badgeDone: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    badgeFailed: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
    },
    text: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.secondary,
    },
    textActive: {
      color: colors.successFg,
    },
    textDone: {
      color: colors.successFg,
    },
    textFailed: {
      color: colors.dangerFg,
    },
  });
}
