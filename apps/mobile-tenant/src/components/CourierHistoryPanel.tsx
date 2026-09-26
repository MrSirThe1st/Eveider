import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CourierDelivery } from '../lib/api';
import {
  filterHistoryByPeriod,
  filterHistoryDeliveries,
  groupHistoryByDay,
  type HistoryPeriod,
  type HistoryStatusFilter,
  type HistoryTypeFilter,
} from '../lib/driver-history';
import { useColors } from '../theme';
import { DriverEmptyState } from './DriverEmptyState';
import { DriverFilterSheet } from './DriverFilterSheet';
import { DriverHistoryRow } from './DriverHistoryRow';
import { PeriodSelectorSheet, PeriodSelectorTrigger } from './PeriodSelectorSheet';

type CourierHistoryPanelProps = {
  items: CourierDelivery[];
  onOpen: (item: CourierDelivery) => void;
};

export function CourierHistoryPanel({ items, onOpen }: CourierHistoryPanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [period, setPeriod] = useState<HistoryPeriod>('90');
  const [type, setType] = useState<HistoryTypeFilter>('all');
  const [status, setStatus] = useState<HistoryStatusFilter>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);

  const periodItems = useMemo(() => filterHistoryByPeriod(items, period), [items, period]);
  const filtered = useMemo(
    () =>
      filterHistoryDeliveries(items, {
        period,
        type,
        status,
        query,
      }),
    [items, period, type, status, query],
  );
  const groups = useMemo(() => groupHistoryByDay(filtered), [filtered]);

  const filtersActive = status !== 'all' || type !== 'all';
  const activeChips: { key: string; label: string; onClear: () => void }[] = [];
  if (type !== 'all') {
    activeChips.push({
      key: 'type',
      label:
        type === 'collect'
          ? t('courier.historyTypeCollect')
          : type === 'deposit'
            ? t('courier.historyTypeDeposit')
            : t('courier.historyTypeReturn'),
      onClear: () => setType('all'),
    });
  }
  if (status !== 'all') {
    activeChips.push({
      key: 'status',
      label:
        status === 'completed'
          ? t('courier.historyStatusCompleted')
          : t('courier.historyStatusFailed'),
      onClear: () => setStatus('all'),
    });
  }

  const empty =
    items.length === 0 ||
    (periodItems.length === 0 && type === 'all' && status === 'all' && !query.trim());

  return (
    <View>
      <View style={styles.toolsRow}>
        <PeriodSelectorTrigger value={period} onPress={() => setPeriodSheetOpen(true)} />
        <View style={styles.toolsRight}>
          <Pressable
            onPress={() => setFilterSheetOpen(true)}
            style={[styles.iconBtn, filtersActive && styles.iconBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={t('courier.historyFilters')}
          >
            <Feather
              name="sliders"
              size={16}
              color={filtersActive ? colors.primary : colors.secondary}
            />
          </Pressable>
          <Pressable
            onPress={() => setSearchOpen((open) => !open)}
            style={[styles.iconBtn, searchOpen && styles.iconBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={t('courier.historySearch')}
          >
            <Feather
              name="search"
              size={16}
              color={searchOpen ? colors.primary : colors.secondary}
            />
          </Pressable>
        </View>
      </View>

      {activeChips.length > 0 ? (
        <View style={styles.chipRow}>
          {activeChips.map((chip) => (
            <Pressable key={chip.key} onPress={chip.onClear} style={styles.activeChip}>
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Feather name="x" size={12} color={colors.successFg} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {searchOpen ? (
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('courier.historySearchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <DriverEmptyState
          compact
          title={empty ? t('courier.historyEmptyTitle') : t('courier.historyFilterEmptyTitle')}
          message={
            empty ? t('courier.historyEmptyMessage') : t('courier.historyFilterEmptyMessage')
          }
        />
      ) : (
        <View style={styles.groups}>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <View style={styles.list}>
                {group.items.map((item, index) => (
                  <DriverHistoryRow
                    key={item.id}
                    delivery={item}
                    onPress={() => onOpen(item)}
                    showSeparator={index < group.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <DriverFilterSheet
        open={filterSheetOpen}
        values={{ type, status }}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(values) => {
          setType(values.type);
          setStatus(values.status);
          setFilterSheetOpen(false);
        }}
      />
      <PeriodSelectorSheet
        open={periodSheetOpen}
        value={period}
        onClose={() => setPeriodSheetOpen(false)}
        onSelect={setPeriod}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    toolsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    toolsRight: {
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    iconBtnActive: {
      borderColor: colors.primary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    activeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: borders.width,
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    activeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.successFg,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondary,
      padding: 0,
    },
    groups: {
      gap: 18,
    },
    group: {
      gap: 2,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 4,
    },
    list: {
      backgroundColor: colors.surface,
    },
  });
}
