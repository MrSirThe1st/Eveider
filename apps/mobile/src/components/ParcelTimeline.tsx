import { colors, radius } from '@eveider/config-ui';
import { PARCEL_STATUSES, PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';

type ParcelTimelineProps = {
  currentStatus: ParcelStatus;
};

export function ParcelTimeline({ currentStatus }: ParcelTimelineProps) {
  const currentIndex = PARCEL_STATUSES.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      {PARCEL_STATUSES.map((status, index) => {
        const reached = index <= currentIndex;
        const isCurrent = status === currentStatus;

        return (
          <View key={status} style={styles.step}>
            <View
              style={[
                styles.dot,
                reached && styles.dotReached,
                isCurrent && styles.dotCurrent,
              ]}
            />
            <Text style={[styles.label, reached && styles.labelReached]}>
              {PARCEL_STATUS_LABELS[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotReached: {
    backgroundColor: colors.primary,
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.border,
  },
  labelReached: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
