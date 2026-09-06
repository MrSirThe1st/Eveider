import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import type { DeliveryStatus } from '@eveider/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import { useColors } from '../theme';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

type DeliveryCardProps = {
  delivery: CourierDelivery;
  highlight?: boolean;
};

const ACTION_STATUSES: DeliveryStatus[] = ['assigned', 'scanned', 'drop_off_pending'];

function actionHint(delivery: CourierDelivery): string | null {
  if (!ACTION_STATUSES.includes(delivery.status)) return null;
  if (delivery.kind === 'return') {
    if (delivery.status === 'assigned') return 'Scan requis — retour';
    if (delivery.status === 'scanned') return 'En route vers le marchand';
    return 'Confirmer la remise';
  }
  if (delivery.status === 'assigned') return 'Scan requis';
  if (delivery.status === 'scanned') return 'En route vers le casier';
  return 'Confirmer le dépôt';
}

export function DeliveryCard({ delivery, highlight }: DeliveryCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const needsAction = ACTION_STATUSES.includes(delivery.status);
  const showHighlight = highlight ?? needsAction;
  const hint = actionHint(delivery);

  return (
    <View
      style={[
        styles.row,
        showHighlight && delivery.status === 'assigned' && styles.highlightWarning,
        showHighlight && delivery.status !== 'assigned' && needsAction && styles.highlightAction,
      ]}
    >
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.reference}>
            {delivery.parcel.trackingNumber ?? delivery.parcel.reference}
          </Text>
          <DeliveryStatusBadge status={delivery.status} />
        </View>
        <Text style={styles.meta}>{delivery.parcel.businessName}</Text>
        <Text style={styles.locker}>{delivery.parcel.locker?.name ?? 'Casier non défini'}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.primary} />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
    },
    highlightAction: {
      borderColor: colors.primary,
    },
    highlightWarning: {
      borderColor: colors.warning,
    },
    body: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    reference: {
      fontWeight: '700',
      fontSize: 15,
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
      flex: 1,
    },
    meta: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    locker: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
    },
    actionHint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
  });
}
