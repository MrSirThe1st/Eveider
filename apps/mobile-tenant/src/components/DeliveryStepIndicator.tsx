import { borders, type ColorTokens } from '@eveider/config-ui';
import type { DeliveryKind, DeliveryStatus } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getDriverDeliveryKind } from '../lib/driver-presentation';
import { useColors } from '../theme';

const ALLER_STEPS = [
  { key: 'assigned', label: 'Récupérer' },
  { key: 'scanned', label: 'Casier' },
  { key: 'drop_off_pending', label: 'Dépôt' },
  { key: 'completed', label: 'Terminé' },
] as const;

const RETURN_STEPS = [
  { key: 'assigned', label: 'Casier' },
  { key: 'scanned', label: 'Entreprise' },
  { key: 'drop_off_pending', label: 'Remise' },
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
  kind?: DeliveryKind | null;
};

export function DeliveryStepIndicator({ status, kind }: DeliveryStepIndicatorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (status === 'failed' || kind === 'return') return null;

  const steps = getDriverDeliveryKind({ kind }) === 'customer_return' ? RETURN_STEPS : ALLER_STEPS;
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
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
