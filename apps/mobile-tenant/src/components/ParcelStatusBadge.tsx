import { colors, radius, borders, nativeShadow, PARCEL_STATUS_FILLS } from '@eveider/config-ui';
import type { ParcelStatus } from '@eveider/domain';
import { PARCEL_STATUS_LABELS } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: PARCEL_STATUS_FILLS[status] }]}>
      <Text style={styles.text}>{PARCEL_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.badge,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
});
