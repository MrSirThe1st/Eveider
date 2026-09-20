import { type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
import { getRecipientJourney } from '../lib/recipient-presentation';
import { useColors } from '../theme';

type ParcelTimelineProps = {
  parcel: CustomerParcel;
};

export function ParcelTimeline({ parcel }: ParcelTimelineProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const journey = getRecipientJourney(parcel);

  return (
    <View style={styles.container}>
      {journey.steps.map((step) => (
        <View key={step.id} style={styles.step}>
          <View
            style={[
              styles.dot,
              (step.done || step.current) && styles.dotReached,
              step.current && styles.dotCurrent,
            ]}
          />
          <Text style={[styles.label, (step.done || step.current) && styles.labelReached]}>
            {step.label}
          </Text>
        </View>
      ))}
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
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    labelReached: {
      color: colors.secondary,
      fontWeight: '600',
    },
  });
}
