import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CustomerParcel } from '../lib/api';
import { getParcelJourney } from '../lib/parcel-journey';
import { useColors } from '../theme';
import { LockerIllustration } from './LockerIllustration';
import { ParcelStatusBadge } from './ParcelStatusBadge';
import { PrimaryButton } from './PrimaryButton';

type ParcelJourneyHeroProps = {
  parcel: CustomerParcel;
  onPressDetail: () => void;
  onPressPickup?: () => void;
  pickupActionLabel?: string;
};

export function ParcelJourneyHero({
  parcel,
  onPressDetail,
  onPressPickup,
  pickupActionLabel,
}: ParcelJourneyHeroProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <ParcelStatusBadge status={parcel.status} />
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
              {t(`journey.${step.id}`)}
            </Text>
          </View>
        ))}
      </View>

      {parcel.locker ? (
        <Pressable onPress={onPressDetail} style={styles.lockerRow}>
          <Feather name="map-pin" size={15} color={colors.secondary} />
          <Text style={styles.lockerText} numberOfLines={2}>
            {parcel.locker.name}
            {parcel.compartmentLabel ? ` · ${parcel.compartmentLabel}` : ''}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        {isReady && onPressPickup ? (
          <PrimaryButton
            label={pickupActionLabel ?? t('home.viewPickupCode')}
            variant="brand"
            onPress={onPressPickup}
          />
        ) : (
          <Pressable onPress={onPressDetail} style={styles.detailLinkWrap}>
            <Text style={styles.detailLink}>{t('journey.viewDetail')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  illustrationWrap: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    lineHeight: 26,
    textAlign: 'center',
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
    backgroundColor: colors.textMuted,
    opacity: 0.35,
  },
  stepConnectorSpacer: {
    backgroundColor: 'transparent',
  },
  stepConnectorDone: {
    backgroundColor: colors.primary,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.textMuted,
  },
  stepLabelDone: {
    color: colors.secondary,
  },
  stepLabelCurrent: {
    color: colors.secondary,
    fontWeight: '600',
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
  },
  detailLinkWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  });
}
