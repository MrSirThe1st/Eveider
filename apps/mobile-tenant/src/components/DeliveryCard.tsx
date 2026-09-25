import { radius, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  getDriverCurrentStop,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type DeliveryCardProps = {
  delivery: CourierDelivery;
  highlight?: boolean;
  variant?: 'queue' | 'history';
};

function formatHistoryDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

export function DeliveryCard({
  delivery,
  highlight = false,
  variant = 'queue',
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
  const historyDate = delivery.completedAt ?? delivery.updatedAt;

  if (variant === 'history') {
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          {historyDate ? (
            <Text style={styles.date}>{formatHistoryDate(historyDate)}</Text>
          ) : null}
          <Text style={styles.movement}>{movement}</Text>
          <Text style={styles.place} numberOfLines={1}>
            {origin.name}
            <Text style={styles.routeArrow}> → </Text>
            {destination.name}
          </Text>
          {(origin.address || destination.address) ? (
            <Text style={styles.address} numberOfLines={2}>
              {[origin.address, destination.address].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <View style={styles.footer}>
            <Text style={[styles.state, delivery.status === 'failed' && styles.stateFailed]}>
              {step.label}
            </Text>
            <Text style={styles.meta}>
              {t('courier.parcelMeta', { count: 1, tracking })}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <View style={styles.body}>
        <Text style={styles.movement}>{movement}</Text>
        <Text style={styles.place} numberOfLines={2}>
          {stop.name}
        </Text>
        {stop.address ? (
          <Text style={styles.address} numberOfLines={2}>
            {stop.address}
          </Text>
        ) : null}

        {active ? <Text style={[styles.state, styles.stateSpaced]}>{step.label}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.meta}>
            {t('courier.parcelMeta', { count: 1, tracking })}
          </Text>
          <Text style={styles.cta}>{t('courier.viewDelivery')}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.primary} />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
    },
    cardHighlight: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primary,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    date: {
      marginBottom: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    movement: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: colors.primary,
    },
    place: {
      marginTop: 6,
      fontSize: 17,
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
    },
    state: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    stateSpaced: {
      marginTop: 10,
    },
    stateFailed: {
      color: colors.danger,
    },
    footer: {
      marginTop: 12,
      gap: 4,
    },
    meta: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    cta: {
      marginTop: 4,
      alignSelf: 'flex-end',
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
