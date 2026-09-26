import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DriverActivityPoint, DriverTypeShare } from '../lib/driver-history';
import { useColors } from '../theme';
import { SectionLabel } from './SectionLabel';

const CHART_HEIGHT = 132;

type MetricTile = {
  label: string;
  value: string;
  hint?: string;
};

type DriverStatsMetricGridProps = {
  metrics: [MetricTile, MetricTile, MetricTile, MetricTile];
};

export function DriverStatsMetricGrid({ metrics }: DriverStatsMetricGridProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricTile}>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          {metric.hint ? <Text style={styles.metricHint}>{metric.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

type DriverActivityChartProps = {
  title: string;
  points: DriverActivityPoint[];
  completedLabel: string;
  failedLabel: string;
  emptyLabel: string;
};

export function DriverActivityChart({
  title,
  points,
  completedLabel,
  failedLabel,
  emptyLabel,
}: DriverActivityChartProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxTotal = Math.max(1, ...points.map((point) => point.total));
  const hasData = points.some((point) => point.total > 0);
  const dense = points.length > 14;

  return (
    <View style={styles.panel}>
      <SectionLabel>{title}</SectionLabel>
      {!hasData ? (
        <Text style={styles.chartEmpty}>{emptyLabel}</Text>
      ) : (
        <>
          <View style={styles.barChart}>
            {points.map((point, index) => {
              const completedH =
                point.total === 0 ? 0 : (point.completed / maxTotal) * CHART_HEIGHT;
              const failedH = point.total === 0 ? 0 : (point.failed / maxTotal) * CHART_HEIGHT;
              const showLabel =
                !dense ||
                index === 0 ||
                index === points.length - 1 ||
                index % Math.ceil(points.length / 6) === 0;
              return (
                <View key={point.key} style={styles.barCol}>
                  <View style={[styles.barTrack, dense && styles.barTrackDense]}>
                    {failedH > 0 ? (
                      <View
                        style={[
                          styles.barSegment,
                          styles.barFailed,
                          { height: Math.max(failedH, 2) },
                        ]}
                      />
                    ) : null}
                    {completedH > 0 ? (
                      <View
                        style={[
                          styles.barSegment,
                          styles.barCompleted,
                          { height: Math.max(completedH, 2) },
                        ]}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.barLabel, dense && styles.barLabelDense]}
                    numberOfLines={1}
                  >
                    {showLabel ? point.label : ' '}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <LegendDot color={colors.primary} label={completedLabel} styles={styles} />
            <LegendDot color={colors.danger} label={failedLabel} styles={styles} />
          </View>
        </>
      )}
    </View>
  );
}

type DriverTypeMixChartProps = {
  title: string;
  rows: DriverTypeShare[];
  labels: Record<DriverTypeShare['key'], string>;
  emptyLabel: string;
};

export function DriverTypeMixChart({
  title,
  rows,
  labels,
  emptyLabel,
}: DriverTypeMixChartProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxCount = Math.max(1, ...rows.map((row) => row.count));
  const hasData = rows.some((row) => row.count > 0);
  const barColors: Record<DriverTypeShare['key'], string> = {
    collect: colors.primary,
    deposit: colors.secondary,
    return: colors.warning,
  };

  return (
    <View style={styles.panel}>
      <SectionLabel>{title}</SectionLabel>
      {!hasData ? (
        <Text style={styles.chartEmpty}>{emptyLabel}</Text>
      ) : (
        <View style={styles.typeList}>
          {rows.map((row) => (
            <View key={row.key} style={styles.typeRow}>
              <View style={styles.typeMeta}>
                <Text style={styles.typeLabel}>{labels[row.key]}</Text>
                <Text style={styles.typeValue}>
                  {row.count} · {row.share}%
                </Text>
              </View>
              <View style={styles.typeTrack}>
                <View
                  style={[
                    styles.typeFill,
                    {
                      width: `${Math.max((row.count / maxCount) * 100, row.count > 0 ? 4 : 0)}%`,
                      backgroundColor: barColors[row.key],
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type DriverSuccessPanelProps = {
  title: string;
  rate: number;
  completed: number;
  failed: number;
  completedLabel: string;
  failedLabel: string;
};

export function DriverSuccessPanel({
  title,
  rate,
  completed,
  failed,
  completedLabel,
  failedLabel,
}: DriverSuccessPanelProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const total = completed + failed;
  const completedShare = total === 0 ? 0 : (completed / total) * 100;

  return (
    <View style={styles.panel}>
      <SectionLabel>{title}</SectionLabel>
      <View style={styles.successRow}>
        <View style={styles.successRing}>
          <Text style={styles.successRate}>{rate}%</Text>
        </View>
        <View style={styles.successAside}>
          <Text style={styles.successAsideLabel}>{completedLabel}</Text>
          <Text style={styles.successAsideValue}>{completed}</Text>
          <Text style={[styles.successAsideLabel, styles.successAsideSpaced]}>
            {failedLabel}
          </Text>
          <Text style={styles.successAsideValue}>{failed}</Text>
        </View>
      </View>
      <View style={styles.successTrack}>
        <View style={[styles.successFill, { width: `${completedShare}%` }]} />
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricTile: {
      width: '47.5%',
      flexGrow: 1,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 16,
      paddingHorizontal: 14,
      gap: 4,
    },
    metricValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    metricHint: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      opacity: 0.8,
    },
    panel: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
    },
    chartEmpty: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    barChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      minHeight: CHART_HEIGHT + 24,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    barTrack: {
      width: '100%',
      maxWidth: 28,
      height: CHART_HEIGHT,
      justifyContent: 'flex-end',
      backgroundColor: colors.background,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    barTrackDense: {
      maxWidth: 12,
    },
    barSegment: {
      width: '100%',
    },
    barCompleted: {
      backgroundColor: colors.primary,
    },
    barFailed: {
      backgroundColor: colors.danger,
    },
    barLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    barLabelDense: {
      fontSize: 8,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 14,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendSwatch: {
      width: 8,
      height: 8,
    },
    legendText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    typeList: {
      gap: 14,
    },
    typeRow: {
      gap: 8,
    },
    typeMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 8,
    },
    typeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    typeValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    typeTrack: {
      height: 10,
      backgroundColor: colors.background,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    typeFill: {
      height: '100%',
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      marginBottom: 16,
    },
    successRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 8,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    successRate: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    successAside: {
      flex: 1,
      gap: 2,
    },
    successAsideLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    successAsideSpaced: {
      marginTop: 10,
    },
    successAsideValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    successTrack: {
      height: 8,
      backgroundColor: colors.background,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    successFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
  });
}
