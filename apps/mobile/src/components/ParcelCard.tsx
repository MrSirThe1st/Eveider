import { colors, radius, borders, nativeShadow } from '@eveider/config-ui';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
import { pickupCardHint } from '../lib/pickup-payment';
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
  const needsPayment =
    Boolean(parcel.pickupPayment?.required) && parcel.pickupPayment?.status !== 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.reference}>{parcel.reference}</Text>
        <ParcelStatusBadge status={parcel.status} />
      </View>
      <Text style={styles.meta}>
        {parcel.businessName} · {formatDate(parcel.createdAt)}
      </Text>
      <Text style={styles.locker}>
        {parcel.locker ? parcel.locker.name : 'Casier non assigné'}
      </Text>
      {pickupCardHint(parcel) ? (
        <Text style={[styles.pinHint, needsPayment && styles.paymentHint]}>
          {pickupCardHint(parcel)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    ...nativeShadow.hard,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reference: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  locker: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.2,
  },
  pinHint: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  paymentHint: {
    color: colors.secondary,
  },
});
