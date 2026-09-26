import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  formatHistoryPlannedDeadline,
  formatHistoryTime,
  getHistoryRowTitle,
  getHistoryStatusLabel,
  getHistoryType,
  historyEventAt,
  isExceptionalHistoryStatus,
} from '../lib/driver-history';
import {
  getDriverDestination,
  getDriverOrigin,
  getDriverTrackingLabel,
  shortDriverPlaceName,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type DriverHistoryRowProps = {
  delivery: CourierDelivery;
  onPress: () => void;
  showSeparator?: boolean;
};

const TYPE_ICON: Record<
  ReturnType<typeof getHistoryType>,
  keyof typeof Feather.glyphMap
> = {
  collect: 'package',
  deposit: 'map-pin',
  return: 'rotate-ccw',
};

/** Dense operational-log row for Historique (not a card). */
export function DriverHistoryRow({
  delivery,
  onPress,
  showSeparator = true,
}: DriverHistoryRowProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const type = getHistoryType(delivery);
  const title = getHistoryRowTitle(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const completedAt = historyEventAt(delivery);
  const timeLabel = formatHistoryTime(completedAt);
  const planned = formatHistoryPlannedDeadline(delivery.dueAt);
  const exceptional = isExceptionalHistoryStatus(delivery);
  const statusLabel = exceptional ? getHistoryStatusLabel(delivery) : null;

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`${title} ${timeLabel}`}
      >
        <View style={[styles.iconWrap, iconTone(type, colors).wrap]}>
          <Feather name={TYPE_ICON[type]} size={14} color={iconTone(type, colors).fg} />
        </View>
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.type} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
          <Text style={styles.place} numberOfLines={1}>
            {shortDriverPlaceName(origin.name)}
            <Text style={styles.arrow}> → </Text>
            {shortDriverPlaceName(destination.name)}
          </Text>
          <View style={styles.meta}>
            {statusLabel ? (
              <Text style={[styles.status, statusTone(delivery, colors)]}>{statusLabel}</Text>
            ) : null}
            <Text style={styles.metaText}>
              {t('courier.parcelCount', { count: 1 })}
              <Text style={styles.metaDot}> · </Text>
              {tracking}
            </Text>
          </View>
          {planned ? <Text style={styles.planned}>{planned}</Text> : null}
        </View>
      </Pressable>
      {showSeparator ? <View style={styles.separator} /> : null}
    </View>
  );
}

function iconTone(
  type: ReturnType<typeof getHistoryType>,
  colors: ColorTokens,
): { wrap: { backgroundColor: string }; fg: string } {
  if (type === 'return') {
    return { wrap: { backgroundColor: colors.surfaceMuted }, fg: colors.secondary };
  }
  if (type === 'collect') {
    return { wrap: { backgroundColor: colors.surfaceMuted }, fg: colors.secondary };
  }
  return { wrap: { backgroundColor: colors.successMuted }, fg: colors.successFg };
}

function statusTone(delivery: CourierDelivery, colors: ColorTokens) {
  if (delivery.status === 'failed') return { color: colors.danger };
  return { color: colors.secondary };
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 2,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    body: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    type: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.35,
      color: colors.textMuted,
    },
    time: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    place: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 19,
    },
    arrow: {
      fontWeight: '500',
      color: colors.textMuted,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 1,
    },
    status: {
      fontSize: 11,
      fontWeight: '700',
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    metaDot: {
      color: colors.textMuted,
    },
    planned: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      marginTop: 1,
    },
    separator: {
      height: borders.width,
      backgroundColor: colors.border,
      marginLeft: 40,
    },
  });
}
