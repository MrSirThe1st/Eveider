import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
import type { ParcelStatus } from '@eveider/domain';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ready = status === 'ready_for_pickup' || status === 'collected';

  return (
    <View style={[styles.badge, ready && styles.badgeReady]}>
      <Text style={[styles.text, ready && styles.textReady]}>{t(`status.${status}`)}</Text>
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
