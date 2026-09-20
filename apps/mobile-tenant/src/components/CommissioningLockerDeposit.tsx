import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { useColors } from '../theme';

type CommissioningLockerDepositProps = {
  mode: 'arrive' | 'note';
  lockerName: string;
  lockerAddress?: string | null;
  onArrive?: () => void;
  arriving?: boolean;
};

/**
 * Temporary software stand-in until the locker terminal confirms deposit.
 * Isolated so Phase 7F / hardware commissioning can remove it cleanly.
 */
export function CommissioningLockerDeposit({
  mode,
  lockerName,
  lockerAddress,
  onArrive,
  arriving,
}: CommissioningLockerDepositProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Mode de secours</Text>
      <Text style={styles.title}>Preuve de dépôt</Text>
      <Text style={styles.body}>
        Le terminal du casier confirmera le dépôt une fois le matériel en service. Cette étape
        photographie uniquement une preuve opérationnelle.
      </Text>
      <Text style={styles.place}>{lockerName}</Text>
      {lockerAddress ? <Text style={styles.address}>{lockerAddress}</Text> : null}
      {mode === 'arrive' && onArrive ? (
        <PrimaryButton
          label="Arrivé au casier"
          onPress={onArrive}
          loading={arriving}
          variant="brand"
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 8,
      marginBottom: 16,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: colors.textMuted,
    },
    place: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    address: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      marginBottom: 8,
    },
  });
}
