import { colors } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CustomerParcel } from '../lib/api';
import { getParcelJourney } from '../lib/parcel-journey';
import { LockerIllustration } from './LockerIllustration';
import { PrimaryButton } from './PrimaryButton';

type ParcelJourneyHeroProps = {
  parcel: CustomerParcel;
  onPressDetail: () => void;
  onPressPickup?: () => void;
};

export function ParcelJourneyHero({ parcel, onPressDetail, onPressPickup }: ParcelJourneyHeroProps) {
  const journey = getParcelJourney(parcel);
  const isReady = parcel.status === 'ready_for_pickup';
  const lastStepIndex = journey.steps.length - 1;

  return (
    <View style={styles.content}>
      <View style={styles.illustrationWrap}>
        <LockerIllustration visual={journey.lockerVisual} />
      </View>

      <Pressable onPress={onPressDetail} style={styles.header}>
        <Text style={styles.headline}>{journey.headline}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{parcel.statusLabel}</Text>
        </View>
      </Pressable>

      <View style={styles.stepper}>
        {journey.steps.map((step, index) => (
          <View key={step.id} style={styles.stepColumn}>
            <View style={styles.stepTrack}>
              <View
                style={[
                  styles.stepConnector,
                  index === 0 && styles.stepConnectorSpacer,
                  index > 0 && journey.steps[index - 1]?.done && styles.stepConnectorDone,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  step.done && styles.stepDotDone,
                  step.current && styles.stepDotCurrent,
                ]}
              >
                {step.done ? (
                  <Feather name="check" size={10} color={colors.secondary} strokeWidth={3} />
                ) : null}
              </View>
              <View
                style={[
                  styles.stepConnector,
                  index === lastStepIndex && styles.stepConnectorSpacer,
                  index < lastStepIndex && step.done && styles.stepConnectorDone,
                ]}
              />
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.done && styles.stepLabelDone,
                step.current && styles.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {parcel.locker ? (
        <Pressable onPress={onPressDetail} style={styles.lockerRow}>
          <Feather name="map-pin" size={15} color={colors.secondary} />
          <Text style={styles.lockerText} numberOfLines={2}>
            {parcel.locker.name}
            {parcel.compartmentLabel ? ` · Comp. ${parcel.compartmentLabel}` : ''}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        {isReady && onPressPickup ? (
          <PrimaryButton label="VOIR LE CODE DE RETRAIT" onPress={onPressPickup} />
        ) : (
          <Pressable onPress={onPressDetail} style={styles.detailLinkWrap}>
            <Text style={styles.detailLink}>Voir le détail du colis</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  illustrationWrap: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.2,
    lineHeight: 28,
    textAlign: 'center',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.secondary,
  },
  stepper: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 4,
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  stepConnectorSpacer: {
    backgroundColor: 'transparent',
  },
  stepConnectorDone: {
    backgroundColor: colors.primary,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    borderColor: colors.secondary,
    transform: [{ scale: 1.06 }],
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    color: colors.border,
  },
  stepLabelDone: {
    color: colors.secondary,
  },
  stepLabelCurrent: {
    color: colors.secondary,
    fontWeight: '700',
  },
  lockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingTop: 4,
  },
  lockerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 1,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
  },
  detailLinkWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLink: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.secondary,
    opacity: 0.55,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
