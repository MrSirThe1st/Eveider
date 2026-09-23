import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../components/ActionRow';
import { AuthRequired } from '../components/AuthRequired';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { useCustomerShell } from '../navigation/customer-shell';
import { fetchPublicLockers, type CustomerLocker } from '../lib/api';
import { getCurrentCoordinates } from '../components/LockerMapView';
import { useColors } from '../theme';

type ParcelSize = 'S' | 'M' | 'L';
type SendStep = 'size' | 'recipient' | 'destination' | 'soon';

export function SendScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isGuest, requestAuth } = useCustomerShell();
  const [step, setStep] = useState<SendStep>('size');
  const [size, setSize] = useState<ParcelSize>('M');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [lockers, setLockers] = useState<CustomerLocker[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');

  const loadLockers = useCallback(async () => {
    const coords = await getCurrentCoordinates();
    const result = await fetchPublicLockers(coords.latitude, coords.longitude);
    if (result.success) {
      setLockers(result.data.lockers);
      if (result.data.lockers[0]) setSelectedLockerId(result.data.lockers[0].id);
    }
  }, []);

  useEffect(() => {
    if (!isGuest && step === 'destination') {
      void loadLockers();
    }
  }, [isGuest, step, loadLockers]);

  const selectedLocker = lockers.find((item) => item.id === selectedLockerId);

  return (
    <View style={styles.screen}>
      <ScreenHeader mode="CLIENT" title={t('tabs.send')} />
      {isGuest ? (
        <View style={styles.body}>
          <AuthRequired
            title={t('authGate.sendTitle')}
            message={t('authGate.sendMessage')}
            onSignIn={() => requestAuth('login')}
            onSignUp={() => requestAuth('register')}
          />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.body}>
          <Text style={styles.subtitle}>{t('send.subtitle')}</Text>

          {step === 'size' ? (
            <>
              <Text style={styles.section}>{t('send.sizeLabel')}</Text>
              {(['S', 'M', 'L'] as const).map((value, index) => (
                <ActionRow
                  key={value}
                  label={t(`send.size.${value}`)}
                  hint={t(`send.sizeHint.${value}`)}
                  selected={size === value}
                  onPress={() => setSize(value)}
                  last={index === 2}
                />
              ))}
              <View style={styles.spacer} />
              <PrimaryButton label={t('common.continue')} onPress={() => setStep('recipient')} />
            </>
          ) : null}

          {step === 'recipient' ? (
            <>
              <TextField
                label={t('send.recipientName')}
                value={recipientName}
                onChangeText={setRecipientName}
                autoCapitalize="words"
              />
              <TextField
                label={t('send.recipientPhone')}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />
              <PrimaryButton
                label={t('common.continue')}
                onPress={() => setStep('destination')}
                disabled={!recipientName.trim() || recipientPhone.trim().length < 8}
              />
              <View style={styles.spacer} />
              <PrimaryButton label={t('send.back')} variant="secondary" onPress={() => setStep('size')} />
            </>
          ) : null}

          {step === 'destination' ? (
            <>
              <Text style={styles.section}>{t('send.destinationLabel')}</Text>
              {lockers.map((locker, index) => (
                <ActionRow
                  key={locker.id}
                  label={locker.name}
                  hint={locker.address}
                  selected={selectedLockerId === locker.id}
                  onPress={() => setSelectedLockerId(locker.id)}
                  last={index === lockers.length - 1}
                />
              ))}
              <View style={styles.spacer} />
              <PrimaryButton
                label={t('common.continue')}
                onPress={() => setStep('soon')}
                disabled={!selectedLockerId}
              />
              <View style={styles.spacer} />
              <PrimaryButton
                label={t('send.back')}
                variant="secondary"
                onPress={() => setStep('recipient')}
              />
            </>
          ) : null}

          {step === 'soon' ? (
            <>
              <Text style={styles.summaryLine}>{t(`send.size.${size}`)}</Text>
              <Text style={styles.summaryLine}>{recipientName}</Text>
              <Text style={styles.summaryLine}>{recipientPhone}</Text>
              {selectedLocker ? <Text style={styles.summaryLine}>{selectedLocker.name}</Text> : null}
              <EmptyState title={t('send.soonTitle')} message={t('send.soonMessage')} />
              <PrimaryButton label={t('send.startOver')} variant="secondary" onPress={() => setStep('size')} />
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  spacer: {
    height: 16,
  },
  summaryLine: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
    marginBottom: 6,
  },
  });
}
