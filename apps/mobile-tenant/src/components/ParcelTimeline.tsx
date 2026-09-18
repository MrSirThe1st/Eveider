import { type ColorTokens } from '@eveider/config-ui';
import { PARCEL_STATUSES, type ParcelStatus, type ShipmentPickupType } from '@eveider/domain';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type ParcelTimelineProps = {
  currentStatus: ParcelStatus;
  pickupType?: ShipmentPickupType;
};

export function ParcelTimeline({ currentStatus, pickupType }: ParcelTimelineProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const steps =
    pickupType === 'merchant_dropoff'
      ? PARCEL_STATUSES.filter((status) => status !== 'in_transit')
      : PARCEL_STATUSES;
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      {steps.map((status, index) => {
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
              {t(`status.${status}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      color: colors.textMuted,
    },
    labelReached: {
      color: colors.secondary,
      fontWeight: '600',
    },
  });
}
