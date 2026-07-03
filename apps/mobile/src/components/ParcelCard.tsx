import { colors, radius } from '@eveider/config-ui';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
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
  const isReady = parcel.status === 'ready_for_pickup';

  return (
    <View style={[styles.card, isReady && styles.highlight]}>
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
      {parcel.status === 'ready_for_pickup' ? (
        <Text style={styles.pinHint}>CODE DE RETRAIT DISPONIBLE</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  highlight: {
    borderWidth: 2,
    borderColor: colors.primary,
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
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
  },
  locker: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  pinHint: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.primary,
  },
});
