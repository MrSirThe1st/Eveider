import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
import { getRecipientParcelStatus } from '../lib/recipient-presentation';
import { useColors } from '../theme';

type ParcelStatusBadgeProps = {
  parcel: CustomerParcel;
};

export function ParcelStatusBadge({ parcel }: ParcelStatusBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = getRecipientParcelStatus(parcel);
  const ready = parcel.status === 'ready_for_pickup';
  const done = parcel.status === 'collected' || parcel.status === 'returned';

  return (
    <View style={[styles.badge, ready && styles.badgeReady, done && styles.badgeReady]}>
      <Text style={[styles.text, (ready || done) && styles.textReady]}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    badge: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.badge,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.background,
      maxWidth: 160,
    },
    badgeReady: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    text: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.secondary,
    },
    textReady: {
      color: colors.successFg,
    },
  });
}
