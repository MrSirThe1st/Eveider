import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CustomerParcel } from '../lib/api';
import { needsPickupPayment } from '../lib/pickup-payment';
import { useColors } from '../theme';
import { ParcelStatusBadge } from './ParcelStatusBadge';

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
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const needsPayment = needsPickupPayment(parcel);
  const hint = needsPayment
    ? parcel.pickupPayment?.amount && parcel.pickupPayment.currency
      ? t('home.paymentAmount', {
          amount: parcel.pickupPayment.amount,
          currency: parcel.pickupPayment.currency,
        })
      : t('home.paymentRequired')
    : parcel.status === 'ready_for_pickup'
      ? t('home.pickupCodeAvailable')
      : null;

  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.reference}>{parcel.trackingNumber ?? parcel.reference}</Text>
          <ParcelStatusBadge status={parcel.status} />
        </View>
        <Text style={styles.meta}>
          {parcel.businessName} · {formatDate(parcel.createdAt)}
        </Text>
        <Text style={styles.locker}>{parcel.locker ? parcel.locker.name : '—'}</Text>
        {hint ? <Text style={styles.pinHint}>{hint}</Text> : null}
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
    pinHint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
  });
}
