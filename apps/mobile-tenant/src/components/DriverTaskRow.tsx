import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CourierClaimableParcel, CourierDelivery } from '../lib/api';
import {
  getDriverDeadlineDisplay,
  getDriverDestination,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverStateLabel,
  getDriverTaskTypeIcon,
  shortDriverPlaceName,
} from '../lib/driver-presentation';
import { useColors } from '../theme';
import { DeadlineIndicator } from './DeadlineIndicator';

type DriverTaskRowProps = {
  delivery?: CourierDelivery;
  claimable?: CourierClaimableParcel;
  highlight?: boolean;
  onPress: () => void;
};

/** Compact work-queue row for Livraisons / Disponibles. */
export function DriverTaskRow({
  delivery,
  claimable,
  highlight = false,
  onPress,
}: DriverTaskRowProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (claimable) {
    const isReturn = claimable.kind === 'customer_return' || claimable.kind === 'return';
    const type = isReturn ? 'Retour' : 'Collecte';
    const typeIcon = isReturn ? 'rotate-ccw' : 'package';
    const origin = isReturn
      ? claimable.lockerName
        ? `Eveider ${claimable.lockerName}`
        : claimable.lockerAddress || 'Casier'
      : claimable.senderAddress || claimable.businessName;
    const destination = isReturn
      ? claimable.businessName
      : claimable.lockerName
        ? `Eveider ${claimable.lockerName}`
        : claimable.lockerAddress || '—';
    const deadline = getDriverDeadlineDisplay(claimable.dueAt);
    const overdue = deadline.kind === 'overdue';

    return (
      <Pressable
        onPress={onPress}
        style={[styles.row, overdue && styles.rowOverdue]}
        accessibilityRole="button"
        accessibilityLabel={`${type} ${origin}`}
      >
        <View style={[styles.iconWrap, styles.iconWrapNeutral]}>
          <Feather name={typeIcon} size={15} color={colors.secondary} />
        </View>
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.type} numberOfLines={1}>
              {type.toUpperCase()}
            </Text>
            <Text style={styles.stateAvailable}>{t('courier.availableBadge')}</Text>
          </View>
          <Text style={styles.place} numberOfLines={1}>
            {shortDriverPlaceName(origin)}
            <Text style={styles.arrow}> → </Text>
            {shortDriverPlaceName(destination)}
          </Text>
          <View style={styles.meta}>
            <DeadlineIndicator dueAt={claimable.dueAt} compact />
            <Text style={styles.metaSep}>·</Text>
            <View style={styles.metaItem}>
              <Feather name="package" size={12} color={colors.textMuted} />
              <Text style={styles.count}>{t('courier.parcelCount', { count: 1 })}</Text>
            </View>
            {claimable.driverInstructions ? (
              <Feather name="info" size={12} color={colors.primary} />
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  if (!delivery) return null;

  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const movement = getDriverMovementLabel(delivery);
  const state = getDriverStateLabel(delivery);
  const typeIcon = getDriverTaskTypeIcon(delivery);
  const deadline = getDriverDeadlineDisplay(delivery.dueAt);
  const overdue = deadline.kind === 'overdue';
  const hasInstructions = Boolean(
    delivery.driverInstructions?.trim() || delivery.parcel.senderInstructions?.trim(),
  );
  const showStatus =
    delivery.status === 'started' ||
    delivery.status === 'scanned' ||
    delivery.status === 'drop_off_pending' ||
    delivery.status === 'assigned' ||
    delivery.status === 'accepted';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        highlight && styles.rowHighlight,
        overdue && !highlight && styles.rowOverdue,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${movement} ${state}`}
    >
      <View
        style={[
          styles.iconWrap,
          highlight ? styles.iconWrapHighlight : styles.iconWrapNeutral,
        ]}
      >
        <Feather
          name={typeIcon}
          size={15}
          color={highlight ? colors.successFg : colors.secondary}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.type} numberOfLines={1}>
            {movement.toUpperCase()}
          </Text>
          {showStatus ? (
            <Text
              style={[
                styles.state,
                (delivery.status === 'started' ||
                  delivery.status === 'scanned' ||
                  delivery.status === 'drop_off_pending') &&
                  styles.stateActive,
              ]}
              numberOfLines={1}
            >
              {state}
            </Text>
          ) : null}
        </View>
        <Text style={styles.place} numberOfLines={1}>
          {shortDriverPlaceName(origin.name)}
          <Text style={styles.arrow}> → </Text>
          {shortDriverPlaceName(destination.name)}
        </Text>
        <View style={styles.meta}>
          <DeadlineIndicator dueAt={delivery.dueAt} compact />
          <Text style={styles.metaSep}>·</Text>
          <View style={styles.metaItem}>
            <Feather name="package" size={12} color={colors.textMuted} />
            <Text style={styles.count}>{t('courier.parcelCount', { count: 1 })}</Text>
          </View>
          {hasInstructions ? <Feather name="info" size={12} color={colors.primary} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
    },
    rowHighlight: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    rowOverdue: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    iconWrapHighlight: {
      backgroundColor: colors.surface,
    },
    iconWrapNeutral: {
      backgroundColor: colors.surfaceMuted,
    },
    body: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    type: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.textMuted,
    },
    state: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      flexShrink: 1,
    },
    stateActive: {
      color: colors.successFg,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    stateAvailable: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    place: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 20,
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
    metaSep: {
      fontSize: 11,
      color: colors.textMuted,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    count: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
