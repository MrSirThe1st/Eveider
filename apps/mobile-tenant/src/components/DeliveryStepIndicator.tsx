import { borders, type ColorTokens } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

const STEPS = [
  { key: 'assigned', label: 'Scan' },
  { key: 'scanned', label: 'Casier' },
  { key: 'drop_off_pending', label: 'Dépôt' },
  { key: 'completed', label: 'Terminé' },
] as const;

const STATUS_ORDER: DeliveryStatus[] = [
  'assigned',
  'scanned',
  'drop_off_pending',
  'completed',
];

type DeliveryStepIndicatorProps = {
  status: DeliveryStatus;
};

export function DeliveryStepIndicator({ status }: DeliveryStepIndicatorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (status === 'failed') return null;

  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = STATUS_ORDER[index] === status;

        return (
          <View key={step.key} style={styles.step}>
            <View
              style={[
                styles.dot,
                reached && styles.dotReached,
                isCurrent && styles.dotCurrent,
              ]}
            />
            <Text style={[styles.label, reached && styles.labelReached]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 12,
      marginBottom: 16,
    },
    step: {
      flex: 1,
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.border,
      marginBottom: 6,
    },
    dotReached: {
      backgroundColor: colors.primary,
    },
    dotCurrent: {
      borderWidth: 2,
      borderColor: colors.secondary,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    labelReached: {
      color: colors.secondary,
    },
  });
}
