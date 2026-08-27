import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ParcelStatusBadge } from '../components/ParcelStatusBadge';
import { ParcelTimeline } from '../components/ParcelTimeline';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScaffold } from '../components/ScreenHeader';
import { useCustomerShell } from '../navigation/customer-shell';
import type { CustomerParcel } from '../lib/api';
import { useColors } from '../theme';

type TrackResultScreenProps = {
  parcel: CustomerParcel;
  onBack: () => void;
};

export function TrackResultScreen({ parcel, onBack }: TrackResultScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const { isGuest, requestAuth, goToReceive } = useCustomerShell();

  return (
    <ScreenScaffold title={t('track.title')} onBack={onBack}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <Text style={styles.reference}>{parcel.trackingNumber ?? parcel.reference}</Text>
        <ParcelStatusBadge status={parcel.status} />
      </View>
      <Text style={styles.meta}>{parcel.businessName}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>{t('customer.tracking')}</Text>
        <ParcelTimeline currentStatus={parcel.status} />
      </View>

      {parcel.locker ? (
        <View style={styles.section}>
          <Text style={styles.label}>{t('customer.locker')}</Text>
          <Text style={styles.text}>{parcel.locker.name}</Text>
          <Text style={styles.subtext}>{parcel.locker.address}</Text>
        </View>
      ) : null}

      {parcel.status === 'ready_for_pickup' ? (
        isGuest ? (
          <PrimaryButton
            label={t('track.signInToPickup')}
            variant="brand"
            onPress={() => requestAuth('login')}
          />
        ) : (
          <PrimaryButton
            label={t('track.openInReceive')}
            variant="brand"
            onPress={() => goToReceive(parcel.id)}
          />
        )
      ) : null}
    </ScrollView>
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
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  reference: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  meta: {
    marginBottom: 24,
    fontWeight: '500',
    color: colors.secondary,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.textMuted,
  },
  text: {
    fontWeight: '600',
    color: colors.secondary,
  },
  subtext: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondary,
  },
  });
}
