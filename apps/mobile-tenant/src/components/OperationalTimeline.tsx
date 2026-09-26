import { type ColorTokens } from '@eveider/config-ui';
import type { DeliveryKind, DeliveryStatus } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getDriverDeliveryKind } from '../lib/driver-presentation';
import { useColors } from '../theme';

type TimelineStep = {
  id: string;
  label: string;
  statuses: DeliveryStatus[];
};

const OUTBOUND_STEPS: TimelineStep[] = [
  { id: 'accept', label: 'Accepté', statuses: ['assigned'] },
  { id: 'start', label: 'Démarré', statuses: ['accepted'] },
  { id: 'pickup', label: 'Pris en charge', statuses: ['started'] },
  { id: 'transit', label: 'Transport', statuses: ['scanned'] },
  { id: 'deposit', label: 'Dépôt', statuses: ['drop_off_pending', 'completed'] },
];

const RETURN_STEPS: TimelineStep[] = [
  { id: 'accept', label: 'Accepté', statuses: ['assigned'] },
  { id: 'start', label: 'Démarré', statuses: ['accepted'] },
  { id: 'pickup', label: 'Pris en charge', statuses: ['started'] },
  { id: 'transit', label: 'Transport', statuses: ['scanned'] },
  { id: 'handoff', label: 'Remise', statuses: ['drop_off_pending', 'completed'] },
];

const STATUS_RANK: Record<DeliveryStatus, number> = {
  assigned: 0,
  accepted: 1,
  started: 2,
  scanned: 3,
  drop_off_pending: 4,
  completed: 5,
  failed: -1,
};

type OperationalTimelineProps = {
  status: DeliveryStatus;
  kind?: DeliveryKind | null;
};

/**
 * Compact horizontal progress under the header.
 * Timeline is context during an active delivery — not primary content.
 */
export function OperationalTimeline({ status, kind }: OperationalTimelineProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (status === 'failed' || kind === 'return') return null;

  const steps =
    getDriverDeliveryKind({ kind }) === 'customer_return' ? RETURN_STEPS : OUTBOUND_STEPS;
  const rank = STATUS_RANK[status] ?? 0;
  const currentStep = steps.find((step) => step.statuses.includes(status)) ?? null;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={styles.rail}>
        {steps.map((step, index) => {
          const stepRank = STATUS_RANK[step.statuses[0]!] ?? index;
          const done = rank > stepRank || (status === 'completed' && index === steps.length - 1);
          const current = step.statuses.includes(status);
          const last = index === steps.length - 1;
          const connectorReached = done;

          return (
            <Fragment key={step.id}>
              <View
                style={[
                  styles.node,
                  done && styles.nodeDone,
                  current && styles.nodeCurrent,
                  !done && !current && styles.nodePending,
                ]}
              >
                {done ? (
                  <Feather name="check" size={10} color={colors.onPrimary} />
                ) : current ? (
                  <View style={styles.currentDot} />
                ) : null}
              </View>
              {!last ? (
                <View
                  style={[styles.connector, connectorReached && styles.connectorReached]}
                />
              ) : null}
            </Fragment>
          );
        })}
      </View>
      {currentStep ? <Text style={styles.currentLabel}>{currentStep.label}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 18,
      paddingTop: 2,
    },
    rail: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    node: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeDone: {
      backgroundColor: colors.primary,
    },
    nodeCurrent: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    nodePending: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    currentDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    connector: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
      backgroundColor: colors.border,
    },
    connectorReached: {
      backgroundColor: colors.primary,
    },
    currentLabel: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
  });
}
