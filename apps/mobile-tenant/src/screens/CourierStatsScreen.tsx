import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
import { DriverEmptyState } from '../components/DriverEmptyState';
import {
  DriverActivityChart,
  DriverStatsMetricGrid,
  DriverSuccessPanel,
  DriverTypeMixChart,
} from '../components/DriverStatsCharts';
import {
  PeriodSelectorSheet,
  PeriodSelectorTrigger,
} from '../components/PeriodSelectorSheet';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import { fetchCourierDeliveries, type CourierDelivery } from '../lib/api';
import {
  buildDriverActivitySeries,
  buildDriverPeriodStats,
  buildDriverTypeShares,
  type HistoryPeriod,
} from '../lib/driver-history';
import { translateDriverError } from '../lib/driver-presentation';
import { useColors } from '../theme';

type CourierStatsScreenProps = {
  onBack: () => void;
};

export function CourierStatsScreen({ onBack }: CourierStatsScreenProps) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';

  const [period, setPeriod] = useState<HistoryPeriod>('30');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDeliveries();
    if (!silent) setLoading(false);
    setRefreshing(false);
    if (!result.success) {
      setError(translateDriverError(result.error));
      return;
    }
    setDeliveries(result.data.deliveries);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => buildDriverPeriodStats(deliveries, period),
    [deliveries, period],
  );
  const activity = useMemo(
    () => buildDriverActivitySeries(deliveries, period, new Date(), locale),
    [deliveries, period, locale],
  );
  const typeShares = useMemo(() => buildDriverTypeShares(stats), [stats]);

  if (loading && deliveries.length === 0) {
    return (
      <ScreenScaffold title={t('courier.statsTitle')} onBack={onBack}>
        <AppSpinner />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title={t('courier.statsTitle')} onBack={onBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.secondary}
          />
        }
      >
        <View style={styles.toolbar}>
          <Text style={styles.toolbarHint}>{t('courier.statsPeriodHint')}</Text>
          <PeriodSelectorTrigger value={period} onPress={() => setPeriodOpen(true)} />
        </View>

        {error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void load()} />
          </View>
        ) : null}

        {!error && stats.total === 0 ? (
          <DriverEmptyState
            title={t('courier.statsEmptyTitle')}
            message={t('courier.statsEmptyMessage')}
            compact
          />
        ) : null}

        {!error && stats.total > 0 ? (
          <>
            <DriverStatsMetricGrid
              metrics={[
                {
                  label: t('courier.metricDeliveries'),
                  value: String(stats.total),
                  hint: t(`courier.historyPeriodChip.${period}`),
                },
                {
                  label: t('courier.metricCompleted'),
                  value: String(stats.completed),
                },
                {
                  label: t('courier.metricIncidents'),
                  value: String(stats.failed),
                },
                {
                  label: t('courier.metricSuccessRate'),
                  value: `${stats.successRate}%`,
                },
              ]}
            />

            <DriverSuccessPanel
              title={t('courier.statsSuccessTitle')}
              rate={stats.successRate}
              completed={stats.completed}
              failed={stats.failed}
              completedLabel={t('courier.metricCompleted')}
              failedLabel={t('courier.metricIncidents')}
            />

            <DriverActivityChart
              title={t('courier.statsActivityTitle')}
              points={activity}
              completedLabel={t('courier.historyStatusCompleted')}
              failedLabel={t('courier.historyStatusFailed')}
              emptyLabel={t('courier.statsChartEmpty')}
            />

            <DriverTypeMixChart
              title={t('courier.statsTypesTitle')}
              rows={typeShares}
              labels={{
                collect: t('courier.historyTypeCollect'),
                deposit: t('courier.historyTypeDeposit'),
                return: t('courier.historyTypeReturn'),
              }}
              emptyLabel={t('courier.statsChartEmpty')}
            />
          </>
        ) : null}
      </ScrollView>

      <PeriodSelectorSheet
        open={periodOpen}
        value={period}
        onClose={() => setPeriodOpen(false)}
        onSelect={setPeriod}
      />
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 14,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 4,
    },
    toolbarHint: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    errorBlock: {
      gap: 12,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
    },
  });
}
