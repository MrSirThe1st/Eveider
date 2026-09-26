import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { HistoryPeriod } from '../lib/driver-history';
import { useColors } from '../theme';
import { BottomSheet, BottomSheetOption } from './BottomSheet';

const PERIODS: HistoryPeriod[] = ['today', '7', '30', '90'];

type PeriodSelectorSheetProps = {
  open: boolean;
  value: HistoryPeriod;
  onClose: () => void;
  onSelect: (period: HistoryPeriod) => void;
};

/** Bottom sheet period picker — history is capped at 90 days. */
export function PeriodSelectorSheet({
  open,
  value,
  onClose,
  onSelect,
}: PeriodSelectorSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('courier.historyPeriodTitle')}
      hint={t('courier.historyPeriodLimit')}
    >
      {PERIODS.map((period, index) => (
        <BottomSheetOption
          key={period}
          label={t(`courier.historyPeriod.${period}`)}
          active={period === value}
          last={index === PERIODS.length - 1}
          onPress={() => {
            onSelect(period);
            onClose();
          }}
        />
      ))}
    </BottomSheet>
  );
}

export function PeriodSelectorTrigger({
  value,
  onPress,
}: {
  value: HistoryPeriod;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={styles.trigger} accessibilityRole="button">
      <Feather name="calendar" size={14} color={colors.secondary} />
      <Text style={styles.triggerText}>{t(`courier.historyPeriodChip.${value}`)}</Text>
      <Feather name="chevron-down" size={14} color={colors.secondary} />
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    triggerText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
  });
}
