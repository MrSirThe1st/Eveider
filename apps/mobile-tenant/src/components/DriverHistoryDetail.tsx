import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  getDriverCurrentStop,
  getDriverPackageSizeLabel,
  getDriverRecordRouteStops,
  getDriverRecordSummary,
  getDriverTrackingLabel,
} from '../lib/driver-presentation';
import { openDispatcherWhatsApp } from '../lib/support';
import { useColors } from '../theme';
import { DriverRouteTrail } from './DriverRouteTrail';
import { DriverSecondaryAction } from './DriverSecondaryAction';
import { LockerMapView } from './LockerMapView';

type DriverHistoryDetailProps = {
  delivery: CourierDelivery;
  onOpenMaps: () => void;
  onOpenProof?: () => void;
};

/** Quiet operational record for completed / exception deliveries. */
export function DriverHistoryDetail({
  delivery,
  onOpenMaps,
  onOpenProof,
}: DriverHistoryDetailProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const summary = getDriverRecordSummary(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const sizeLabel = getDriverPackageSizeLabel(delivery.parcel.packageSize);
  const route = getDriverRecordRouteStops(delivery);
  const current = getDriverCurrentStop(delivery);
  const tone = toneColors(summary.tone, colors);

  const mapPins =
    current.latitude != null && current.longitude != null
      ? [
          {
            id: delivery.id,
            name: current.name,
            address: current.address ?? '',
            latitude: current.latitude,
            longitude: current.longitude,
            availableCompartments: 0,
          },
        ]
      : [];

  const parcelBits = [
    t('courier.parcelCount', { count: 1 }),
    sizeLabel,
  ].filter(Boolean);

  return (
    <View>
      <View style={styles.summary}>
        <View style={[styles.summaryIcon, { backgroundColor: tone.muted }]}>
          <Feather name={summary.icon} size={16} color={tone.fg} />
        </View>
        <View style={styles.summaryText}>
          <Text style={[styles.summaryTitle, { color: tone.fg }]}>{summary.title}</Text>
          <Text style={styles.summarySubtitle}>{summary.subtitle}</Text>
        </View>
      </View>

      <Text style={styles.tracking} numberOfLines={1}>
        {tracking}
      </Text>
      {parcelBits.length > 0 ? (
        <Text style={styles.parcelMeta}>{parcelBits.join(' · ')}</Text>
      ) : null}
      {delivery.parcel.recipientName ? (
        <Text style={styles.parcelMeta}>Destinataire · {delivery.parcel.recipientName}</Text>
      ) : null}

      <DriverRouteTrail title={route.title} stops={route.stops} footnote={route.footnote} />

      {mapPins.length > 0 ? (
        <Pressable
          onPress={onOpenMaps}
          style={styles.mapWrap}
          accessibilityRole="button"
          accessibilityLabel={t('courier.openMaps')}
        >
          <LockerMapView lockers={mapPins} height={120} />
        </Pressable>
      ) : null}

      <DriverSecondaryAction
        label={t('courier.openMaps')}
        onPress={onOpenMaps}
        variant="quiet"
        icon="navigation"
      />

      {delivery.hasDropOffPhoto && onOpenProof ? (
        <DriverSecondaryAction
          label="Voir la preuve de dépôt"
          onPress={onOpenProof}
          variant="quiet"
          icon="image"
        />
      ) : null}

      <View style={styles.dispatchDivider} />
      <DriverSecondaryAction
        label={t('courier.contactDispatch')}
        onPress={() =>
          openDispatcherWhatsApp({
            trackingNumber: tracking,
            lockerName: delivery.parcel.locker?.name,
            statusLabel: summary.title,
          })
        }
        variant="quiet"
        icon="message-circle"
      />
    </View>
  );
}

function toneColors(tone: 'success' | 'danger' | 'muted', colors: ColorTokens) {
  if (tone === 'danger') return { fg: colors.danger, muted: colors.dangerMuted };
  if (tone === 'success') return { fg: colors.successFg, muted: colors.successMuted };
  return { fg: colors.secondary, muted: colors.surfaceMuted };
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    summary: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    summaryIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryText: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    summarySubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    tracking: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
      marginBottom: 4,
    },
    parcelMeta: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    mapWrap: {
      marginTop: 12,
      marginBottom: 4,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    dispatchDivider: {
      marginTop: 10,
      marginBottom: 2,
      height: borders.width,
      backgroundColor: colors.border,
    },
  });
}
