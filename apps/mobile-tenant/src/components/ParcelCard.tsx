import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
import {
  getRecipientNextActionHint,
  getRecipientParcelStatus,
} from '../lib/recipient-presentation';
import { useColors } from '../theme';

type ParcelCardProps = {
  parcel: CustomerParcel;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

export function ParcelCard({ parcel }: ParcelCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const status = getRecipientParcelStatus(parcel);
  const hint = getRecipientNextActionHint(parcel);
  const lockerName = parcel.customerReturn?.returnLocker?.name ?? parcel.locker?.name;

  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.reference}>{parcel.trackingNumber ?? parcel.reference}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <Text style={styles.meta}>
          {parcel.businessName} · {formatDate(parcel.updatedAt)}
        </Text>
        {lockerName ? <Text style={styles.locker}>Casier Eveider {lockerName}</Text> : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    status: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      flexShrink: 1,
      textAlign: 'right',
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
    hint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
  });
}
