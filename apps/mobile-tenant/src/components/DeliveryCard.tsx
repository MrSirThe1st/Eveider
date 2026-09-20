import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  getDriverDeliveryKindLabel,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverOrigin,
  getDriverPackageSizeLabel,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type DeliveryCardProps = {
  delivery: CourierDelivery;
  highlight?: boolean;
};

function formatCompletedAt(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function DeliveryCard({ delivery, highlight }: DeliveryCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const kindLabel = getDriverDeliveryKindLabel(delivery);
  const step = getDriverDeliveryStep(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const sizeLabel = getDriverPackageSizeLabel(delivery.parcel.packageSize);
  const active = isActiveDriverDelivery(delivery);
  const showHighlight = highlight ?? active;

  return (
    <View style={[styles.row, showHighlight && styles.highlight]}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.kind}>{kindLabel.toUpperCase()}</Text>
          {active ? <Text style={styles.step}>{step.label}</Text> : null}
        </View>
        <Text style={styles.tracking}>{tracking}</Text>
        {sizeLabel ? <Text style={styles.size}>{sizeLabel}</Text> : null}
        {!active && delivery.completedAt ? (
          <Text style={styles.size}>{formatCompletedAt(delivery.completedAt)}</Text>
        ) : null}

        <View style={styles.leg}>
          <Text style={styles.action}>{origin.action}</Text>
          <Text style={styles.place}>{origin.name}</Text>
          {origin.address ? <Text style={styles.address}>{origin.address}</Text> : null}
        </View>
        <Text style={styles.arrow}>↓</Text>
        <View style={styles.leg}>
          <Text style={styles.action}>{destination.action}</Text>
          <Text style={styles.place}>{destination.name}</Text>
          {destination.address ? <Text style={styles.address}>{destination.address}</Text> : null}
        </View>
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
    highlight: {
      borderColor: colors.primary,
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
    kind: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.secondary,
    },
    step: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    tracking: {
      marginTop: 8,
      fontWeight: '700',
      fontSize: 16,
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    size: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
    leg: {
      marginTop: 10,
    },
    action: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    place: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    address: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    arrow: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textMuted,
    },
  });
}
