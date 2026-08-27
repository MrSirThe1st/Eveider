import { type ColorTokens } from '@eveider/config-ui';
import { PARCEL_STATUSES, type ParcelStatus } from '@eveider/domain';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type ParcelTimelineProps = {
  currentStatus: ParcelStatus;
};

export function ParcelTimeline({ currentStatus }: ParcelTimelineProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
