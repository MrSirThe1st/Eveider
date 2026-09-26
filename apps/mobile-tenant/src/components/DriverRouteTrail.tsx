import { type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DriverRouteTrailStop } from '../lib/driver-presentation';
import { useColors } from '../theme';

type DriverRouteTrailProps = {
  title: string;
  stops: DriverRouteTrailStop[];
  footnote?: string;
};

/** Card-free vertical route for history/record detail. */
export function DriverRouteTrail({ title, stops, footnote }: DriverRouteTrailProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.list}>
        {stops.map((stop, index) => {
          const last = index === stops.length - 1;
          return (
            <View key={stop.id} style={styles.row}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    stop.reached ? styles.dotReached : styles.dotPending,
                  ]}
                />
                {!last ? (
                  <View
                    style={[
                      styles.line,
                      stop.reached && stops[index + 1]?.reached
                        ? styles.lineReached
                        : styles.linePending,
                    ]}
                  />
                ) : null}
              </View>
              <View style={[styles.body, !last && styles.bodyGap]}>
                <Text style={[styles.label, !stop.reached && styles.labelPending]}>
                  {stop.label.toUpperCase()}
                </Text>
                <Text style={[styles.name, !stop.reached && styles.namePending]} numberOfLines={2}>
                  {stop.name}
                </Text>
                {stop.address ? (
                  <Text style={styles.address} numberOfLines={2} ellipsizeMode="tail">
                    {stop.address}
                  </Text>
                ) : null}
                {stop.meta ? <Text style={styles.meta}>{stop.meta}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginTop: 18,
      marginBottom: 8,
    },
    title: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.textMuted,
      marginBottom: 12,
    },
    list: {
      gap: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    rail: {
      width: 14,
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 3,
    },
    dotReached: {
      backgroundColor: colors.primary,
    },
    dotPending: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    line: {
      width: 2,
      flex: 1,
      minHeight: 28,
      marginTop: 4,
      marginBottom: 2,
    },
    lineReached: {
      backgroundColor: colors.primary,
    },
    linePending: {
      backgroundColor: colors.border,
    },
    body: {
      flex: 1,
      paddingBottom: 4,
      minWidth: 0,
    },
    bodyGap: {
      paddingBottom: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.35,
      color: colors.textMuted,
      marginBottom: 3,
    },
    labelPending: {
      color: colors.textMuted,
      opacity: 0.75,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.secondary,
      lineHeight: 20,
    },
    namePending: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    address: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400',
      color: colors.textMuted,
    },
    meta: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondary,
    },
    footnote: {
      marginTop: 14,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
