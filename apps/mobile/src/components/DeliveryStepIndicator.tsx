import { colors, radius } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { StyleSheet, Text, View } from 'react-native';

const STEPS = [
  { key: 'assigned', label: 'SCAN' },
  { key: 'scanned', label: 'CASIER' },
  { key: 'drop_off_pending', label: 'DÉPÔT' },
  { key: 'completed', label: 'TERMINÉ' },
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 20,
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.border,
  },
  labelReached: {
    color: colors.secondary,
  },
});
