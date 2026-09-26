import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';
import { DeadlineIndicator } from './DeadlineIndicator';

type RouteStopRowProps = {
  index: number;
  kindLabel: string;
  name: string;
  actionLabel: string;
  address?: string | null;
  dueAt?: string | null;
  onNavigate?: () => void;
  navigateLabel?: string;
  highlight?: boolean;
};

function clampAddress(address: string, max = 96) {
  const value = address.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Numbered stop row for the driver Itinéraire screen. */
export function RouteStopRow({
  index,
  kindLabel,
  name,
  actionLabel,
  address,
  dueAt,
  onNavigate,
  navigateLabel,
  highlight = false,
}: RouteStopRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <View style={[styles.index, highlight && styles.indexHighlight]}>
        <Text style={styles.indexText}>{index}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.kind} numberOfLines={2}>
          {kindLabel}
          <Text style={styles.sep}> · </Text>
          {name}
        </Text>
        <Text style={styles.action} numberOfLines={1}>
          {actionLabel}
        </Text>
        {dueAt !== undefined ? (
          <View style={styles.deadline}>
            <DeadlineIndicator dueAt={dueAt} compact />
          </View>
        ) : null}
        {address ? (
          <Text style={styles.address} numberOfLines={2} ellipsizeMode="tail">
            {clampAddress(address)}
          </Text>
        ) : null}
      </View>
      {onNavigate ? (
        <Pressable
          onPress={onNavigate}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={navigateLabel ?? 'Itinéraire'}
          style={styles.navBtn}
        >
          <Feather name="navigation" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    rowHighlight: {
      borderColor: colors.primary,
    },
    index: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    indexHighlight: {
      backgroundColor: colors.primary,
    },
    indexText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    kind: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.secondary,
    },
    sep: {
      fontWeight: '500',
      color: colors.textMuted,
    },
    action: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    deadline: {
      marginTop: 4,
    },
    address: {
      marginTop: 3,
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
    navBtn: {
      padding: 6,
    },
  });
}
