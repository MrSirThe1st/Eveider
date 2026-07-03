import { colors, radius } from '@eveider/config-ui';
import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{PARCEL_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
});
