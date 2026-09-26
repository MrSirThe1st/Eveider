import { borders, type ColorTokens } from '@eveider/config-ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HistoryStatusFilter, HistoryTypeFilter } from '../lib/driver-history';
import { useColors } from '../theme';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';

export type DriverFilterValues = {
  type: HistoryTypeFilter;
  status: HistoryStatusFilter;
};

type DriverFilterSheetProps = {
  open: boolean;
  values: DriverFilterValues;
  onClose: () => void;
  onApply: (values: DriverFilterValues) => void;
  showType?: boolean;
  showStatus?: boolean;
};

export function DriverFilterSheet({
  open,
  values,
  onClose,
  onApply,
  showType = true,
  showStatus = true,
}: DriverFilterSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const typeOptions: { value: HistoryTypeFilter; label: string }[] = [
    { value: 'all', label: t('courier.historyTypeAll') },
    { value: 'collect', label: t('courier.historyTypeCollect') },
    { value: 'deposit', label: t('courier.historyTypeDeposit') },
    { value: 'return', label: t('courier.historyTypeReturn') },
  ];
  const statusOptions: { value: HistoryStatusFilter; label: string }[] = [
    { value: 'all', label: t('courier.historyStatusAll') },
    { value: 'completed', label: t('courier.historyStatusCompleted') },
    { value: 'failed', label: t('courier.historyStatusFailed') },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={t('courier.historyFilters')}>
      {showType ? (
        <View style={styles.section}>
          <Text style={styles.label}>{t('courier.historyTypeLabel')}</Text>
          <View style={styles.chips}>
            {typeOptions.map((option) => {
              const active = draft.type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDraft((current) => ({ ...current, type: option.value }))}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {showStatus ? (
        <View style={styles.section}>
          <Text style={styles.label}>{t('courier.historyStatusLabel')}</Text>
          <View style={styles.chips}>
            {statusOptions.map((option) => {
              const active = draft.status === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDraft((current) => ({ ...current, status: option.value }))}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <PrimaryButton
        label={t('courier.historyApplyFilters')}
        onPress={() => onApply(draft)}
        variant="brand"
      />
      <Pressable
        onPress={() => {
          const reset = { type: 'all' as const, status: 'all' as const };
          setDraft(reset);
          onApply(reset);
        }}
        style={styles.reset}
      >
        <Text style={styles.resetText}>{t('courier.historyResetFilters')}</Text>
      </Pressable>
    </BottomSheet>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    section: {
      gap: 8,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    chipActive: {
      borderColor: 'transparent',
      backgroundColor: colors.successMuted,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    chipTextActive: {
      color: colors.successFg,
    },
    reset: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    resetText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
