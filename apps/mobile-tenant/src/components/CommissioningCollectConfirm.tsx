import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { useColors } from '../theme';

type CommissioningCollectConfirmProps = {
  loading?: boolean;
  onConfirm: () => void;
};

/**
 * Temporary software stand-in until the locker terminal reports collection.
 * Isolated so Phase 7F / hardware commissioning can remove it cleanly.
 */
export function CommissioningCollectConfirm({
  loading,
  onConfirm,
}: CommissioningCollectConfirmProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Mode de secours</Text>
      <Text style={styles.title}>Confirmer le retrait</Text>
      <Text style={styles.body}>
        Le casier confirmera le retrait une fois le matériel en service. Utilisez cette action
        uniquement si vous avez déjà récupéré le colis.
      </Text>
      <PrimaryButton
        label="J’ai retiré le colis"
        onPress={onConfirm}
        loading={loading}
        variant="secondary"
      />
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
      marginTop: 16,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
    },
    body: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 8,
    },
  });
}
