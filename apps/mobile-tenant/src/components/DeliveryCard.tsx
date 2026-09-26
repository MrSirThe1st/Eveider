import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  formatHistoryTime,
  getHistoryStatusLabel,
  historyEventAt,
} from '../lib/driver-history';
import {
  getDriverCurrentStop,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverParcelActionLabel,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type DeliveryCardProps = {
  delivery: CourierDelivery;
  highlight?: boolean;
  variant?: 'queue' | 'history';
  onItinerary?: () => void;
};

/** Keep list cards calm when Congolese addresses run long. */
function clampAddress(address: string, max = 96) {
  const value = address.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Driver delivery list card — mirrors destinataire ParcelCard chrome
 * (bordered surface, clear hierarchy, subdued secondary route action).
 */
export function DeliveryCard({
  delivery,
  highlight = false,
  variant = 'queue',
  onItinerary,
}: DeliveryCardProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const movement = getDriverMovementLabel(delivery);
  const step = getDriverDeliveryStep(delivery);
  const stop = getDriverCurrentStop(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const active = isActiveDriverDelivery(delivery);
  const parcelAction = getDriverParcelActionLabel(delivery);
  const historyAt = historyEventAt(delivery);
  const historyStatus = getHistoryStatusLabel(delivery);

  if (variant === 'history') {
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.movement} numberOfLines={1}>
              {movement.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.status,
                delivery.status === 'completed' && styles.statusDone,
                delivery.status === 'failed' && styles.statusFailed,
              ]}
              numberOfLines={1}
            >
              {delivery.status === 'completed' ? `${historyStatus} ✓` : historyStatus}
            </Text>
          </View>
          <Text style={styles.place} numberOfLines={1}>
            {origin.name}
            <Text style={styles.routeArrow}> → </Text>
            {destination.name}
          </Text>
          <View style={styles.historyFooter}>
            <Text style={styles.meta}>{t('courier.parcelCount', { count: 1 })}</Text>
            <Text style={styles.time}>{formatHistoryTime(historyAt)}</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <View style={styles.body}>
        {highlight ? <Text style={styles.nextKicker}>{t('courier.nextStop')}</Text> : null}
        <View style={styles.header}>
          <Text style={styles.movement} numberOfLines={1}>
            {movement}
          </Text>
          {active ? (
            <Text style={styles.status} numberOfLines={1}>
              {step.label}
            </Text>
          ) : null}
        </View>
        <Text style={styles.place} numberOfLines={2}>
          {stop.name}
        </Text>
        {stop.address ? (
          <Text style={styles.address} numberOfLines={2} ellipsizeMode="tail">
            {clampAddress(stop.address)}
          </Text>
        ) : null}
        {active && parcelAction ? <Text style={styles.hint}>{parcelAction}</Text> : null}
        {onItinerary ? (
          <Pressable
            onPress={onItinerary}
            style={styles.itineraryBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('courier.stopItinerary')}
          >
            <Feather name="navigation" size={13} color={colors.primary} />
            <Text style={styles.itineraryText}>{t('courier.stopItinerary')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Feather name="chevron-right" size={16} color={colors.textMuted} />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
    },
    cardHighlight: {
      borderColor: colors.primary,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    nextKicker: {
      marginBottom: 6,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    movement: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: colors.primary,
    },
    status: {
      maxWidth: '46%',
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondary,
      flexShrink: 1,
      textAlign: 'right',
    },
    statusFailed: {
      color: colors.danger,
    },
    date: {
      marginBottom: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    historyFooter: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    time: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    statusDone: {
      color: colors.successFg,
    },
    place: {
      marginTop: 6,
      fontSize: 15,
      fontWeight: '700',
      color: colors.secondary,
    },
    routeArrow: {
      fontWeight: '500',
      color: colors.textMuted,
    },
    address: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      maxHeight: 36,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? ({
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as object)
        : null),
    },
    hint: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
    meta: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    itineraryBtn: {
      marginTop: 10,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    itineraryText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
