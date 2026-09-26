import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getDriverDeadlineDisplay,
  type DriverDeadlineKind,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type DeadlineIndicatorProps = {
  dueAt?: string | null;
  compact?: boolean;
};

export function DeadlineIndicator({ dueAt, compact = false }: DeadlineIndicatorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const display = getDriverDeadlineDisplay(dueAt);
  const tone = toneForKind(display.kind, colors);
  const urgent = display.kind === 'overdue' || display.kind === 'minutes';

  return (
    <View style={[styles.row, compact && styles.compact]}>
      <Feather name="clock" size={compact ? 12 : 14} color={tone} />
      <Text
        style={[
          styles.label,
          { color: tone },
          compact && styles.labelCompact,
          urgent && styles.labelUrgent,
          display.kind === 'none' && styles.labelQuiet,
        ]}
      >
        {display.label}
      </Text>
    </View>
  );
}

function toneForKind(kind: DriverDeadlineKind, colors: ColorTokens): string {
  if (kind === 'overdue' || kind === 'minutes') return colors.danger;
  if (kind === 'today') return colors.secondary;
  return colors.textMuted;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    compact: {
      gap: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    labelCompact: {
      fontSize: 12,
    },
    labelUrgent: {
      fontWeight: '700',
    },
    labelQuiet: {
      fontWeight: '500',
    },
  });
}
