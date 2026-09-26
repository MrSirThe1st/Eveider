import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type Metric = {
  value: string | number;
  label: string;
};

type DriverSummaryCardProps =
  | {
      variant: 'history';
      metrics: [Metric, Metric, Metric];
      footer?: string;
    }
  | {
      variant: 'route';
      title: string;
      subtitle?: string;
    }
  | {
      variant: 'idle';
      message: string;
    };

/** Operational summary surface for Statistiques bilan and Itinéraire header. */
export function DriverSummaryCard(props: DriverSummaryCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (props.variant === 'idle') {
    return (
      <View style={styles.card}>
        <Text style={styles.idle}>{props.message}</Text>
      </View>
    );
  }

  if (props.variant === 'route') {
    return (
      <View style={[styles.card, styles.routeCard]}>
        <Text style={styles.routeKicker}>{props.title}</Text>
        {props.subtitle ? <Text style={styles.routeSubtitle}>{props.subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.metricsRow}>
        {props.metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      {props.footer ? <Text style={styles.footer}>{props.footer}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    routeCard: {
      marginBottom: 12,
      borderColor: colors.primary,
    },
    idle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 20,
      textAlign: 'center',
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    metric: {
      flex: 1,
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
    },
    footer: {
      marginTop: 14,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
    },
    routeKicker: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    routeSubtitle: {
      marginTop: 6,
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
    },
  });
}
