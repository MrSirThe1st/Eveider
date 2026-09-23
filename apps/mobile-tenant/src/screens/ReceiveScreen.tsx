import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
import { AuthRequired } from '../components/AuthRequired';
import { CommissioningCollectConfirm } from '../components/CommissioningCollectConfirm';
import { EmptyState } from '../components/EmptyState';
import { openAddressSearch, openDirections } from '../components/LockerMapView';
import { ParcelCard } from '../components/ParcelCard';
import { ParcelStatusBadge } from '../components/ParcelStatusBadge';
import { ParcelTimeline } from '../components/ParcelTimeline';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { ScreenHeader, ScreenScaffold } from '../components/ScreenHeader';
import { SuccessBanner } from '../components/SuccessBanner';
import {
  cancelCustomerReturn,
  confirmCustomerReturnDeposit,
  fetchCustomerNotifications,
  fetchCustomerParcel,
  fetchCustomerParcels,
  fetchPickupPaymentProviders,
  fetchPickupPaymentStatus,
  fetchProfile,
  initiatePickupPayment,
  markCustomerParcelCollected,
  reportCustomerIssue,
  requestCustomerReturn,
  trackParcelByNumber,
  type CustomerParcel,
  type PaymentProvider,
} from '../lib/api';
import {
  applyRecipientMutationResult,
  canShowCollectionCode,
  getRecipientParcelStatus,
  getRecipientPrimaryAction,
  getRecipientStatusDetail,
  groupRecipientParcels,
  hasMissingCanonicalCharge,
  isPaymentProviderUnavailable,
  needsRecipientPayment,
  translateRecipientError,
} from '../lib/recipient-presentation';
import { useColors } from '../theme';

type CustomerScreen =
  | { name: 'list' }
  | { name: 'detail'; parcelId: string }
  | { name: 'payment'; parcelId: string }
  | { name: 'pickup'; parcelId: string }
  | { name: 'report'; parcelId: string }
  | { name: 'return-request'; parcelId: string }
  | { name: 'return-instructions'; parcelId: string };

type ReceiveScreenProps = {
  titleKey?: 'tabs.parcels';
  initialParcelId?: string;
  focusNonce?: number;
  isGuest?: boolean;
  onRequestAuth?: () => void;
  onOpenNotifications?: () => void;
  onTrackResult?: (parcel: CustomerParcel) => void;
};

export function ReceiveScreen({
  titleKey = 'tabs.parcels',
  initialParcelId,
  focusNonce = 0,
  isGuest = false,
  onRequestAuth,
  onOpenNotifications,
  onTrackResult,
}: ReceiveScreenProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [screen, setScreen] = useState<CustomerScreen>(
    initialParcelId ? { name: 'detail', parcelId: initialParcelId } : { name: 'list' },
  );
  const [parcels, setParcels] = useState<CustomerParcel[]>([]);
  const [parcel, setParcel] = useState<CustomerParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [tracking, setTracking] = useState(false);

  const loadList = useCallback(
    async (silent = false) => {
      if (isGuest) {
        setParcels([]);
        setError(null);
        setUnreadCount(0);
        if (!silent) setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      const [result, notifications] = await Promise.all([
        fetchCustomerParcels(),
        fetchCustomerNotifications(),
      ]);
      if (!silent) setLoading(false);
      setRefreshing(false);
      if (!result.success) {
        setError(translateRecipientError(result.error));
        setParcels([]);
        return;
      }
      setParcels(result.data.parcels);
      if (notifications.success) setUnreadCount(notifications.data.unreadCount);
    },
    [isGuest],
  );

  const loadParcel = useCallback(async (parcelId: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCustomerParcel(parcelId);
    if (!silent) setLoading(false);
    if (!result.success) {
      setError(translateRecipientError(result.error));
      setParcel(null);
      return;
    }
    setParcel(result.data.parcel);
  }, []);

  useEffect(() => {
    if (initialParcelId) setScreen({ name: 'detail', parcelId: initialParcelId });
  }, [initialParcelId, focusNonce]);

  useEffect(() => {
    if (screen.name === 'list') void loadList();
    else void loadParcel(screen.parcelId, screen.name === 'payment' || screen.name === 'pickup');
  }, [screen, loadList, loadParcel]);

  useEffect(() => {
    if (screen.name !== 'payment') return;
    void (async () => {
      const [providersResult, profileResult] = await Promise.all([
        fetchPickupPaymentProviders(),
        fetchProfile(),
      ]);
      if (providersResult.success) {
        setPaymentProviders(providersResult.data.providers);
        setSelectedProvider(providersResult.data.providers[0]?.id ?? '');
      }
      if (profileResult.success) setPaymentPhone(profileResult.data.phone ?? '');
    })();
  }, [screen]);

  useEffect(() => {
    if (screen.name !== 'payment' || !parcel || parcel.id !== screen.parcelId) return;
    if (parcel.pickupPayment?.status !== 'processing') return;
    const interval = setInterval(() => {
      void fetchPickupPaymentStatus(screen.parcelId).then((result) => {
        if (!result.success) return;
        setParcel(result.data.parcel);
        if (canShowCollectionCode(result.data.parcel)) {
          setScreen({ name: 'pickup', parcelId: screen.parcelId });
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [screen, parcel]);

  function goBack() {
    if (screen.name === 'list') return;
    if (screen.name === 'detail') {
      setScreen({ name: 'list' });
      return;
    }
    setScreen({ name: 'detail', parcelId: screen.parcelId });
  }

  function openPrimaryAction(item: CustomerParcel) {
    const action = getRecipientPrimaryAction(item);
    if (action.id === 'pay' || action.id === 'retry_payment') {
      setScreen({ name: 'payment', parcelId: item.id });
      return;
    }
    if (action.id === 'view_collection_code') {
      setScreen({ name: 'pickup', parcelId: item.id });
      return;
    }
    if (action.id === 'request_return') {
      setScreen({ name: 'return-request', parcelId: item.id });
      return;
    }
    if (action.id === 'view_return_instructions') {
      setScreen({ name: 'return-instructions', parcelId: item.id });
      return;
    }
    setScreen({ name: 'detail', parcelId: item.id });
  }

  async function handleTrack() {
    const value = trackingNumber.trim();
    setError(null);
    if (value.length < 8) {
      setError(t('track.tooShort'));
      return;
    }
    const local = parcels.find(
      (item) =>
        item.trackingNumber.toLowerCase() === value.toLowerCase() ||
        (item.reference ?? '').toLowerCase() === value.toLowerCase(),
    );
    if (local) {
      setScreen({ name: 'detail', parcelId: local.id });
      return;
    }
    setTracking(true);
    const result = await trackParcelByNumber(value);
    setTracking(false);
    if (!result.success || !result.data.parcel) {
      setError(result.success ? t('track.notFound') : translateRecipientError(result.error));
      return;
    }
    const owned = parcels.some((item) => item.id === result.data.parcel!.id);
    if (owned) {
      setScreen({ name: 'detail', parcelId: result.data.parcel.id });
      return;
    }
    onTrackResult?.(result.data.parcel);
  }

  async function mutateParcel(
    previous: CustomerParcel,
    result: Awaited<ReturnType<typeof requestCustomerReturn>>,
  ) {
    const next = applyRecipientMutationResult(previous, result);
    if (!next.succeeded) {
      setError(next.error);
      return null;
    }
    setParcel(next.value);
    setParcels((current) => current.map((item) => (item.id === next.value.id ? next.value : item)));
    return next.value;
  }

  async function handleCollect(item: CustomerParcel) {
    setCollecting(true);
    setError(null);
    const updated = await mutateParcel(item, await markCustomerParcelCollected(item.id));
    setCollecting(false);
    if (updated) setScreen({ name: 'detail', parcelId: item.id });
  }

  async function handleRequestReturn(item: CustomerParcel) {
    setCollecting(true);
    setError(null);
    const updated = await mutateParcel(item, await requestCustomerReturn(item.id));
    setCollecting(false);
    if (updated) {
      setIssueSuccess('Retour demandé. L’entreprise doit examiner votre demande.');
      setScreen({ name: 'detail', parcelId: item.id });
    }
  }

  async function handleCancelReturn(item: CustomerParcel) {
    setCollecting(true);
    setError(null);
    await mutateParcel(item, await cancelCustomerReturn(item.id));
    setCollecting(false);
  }

  async function handleConfirmReturnDeposit(item: CustomerParcel) {
    const lockerId = item.customerReturn?.returnLocker?.id;
    const returnCode = item.customerReturn?.returnCode;
    if (!lockerId || !returnCode) {
      setError('Casier ou code de retour manquant.');
      return;
    }
    setCollecting(true);
    setError(null);
    const updated = await mutateParcel(
      item,
      await confirmCustomerReturnDeposit(item.id, { lockerId, returnCode }),
    );
    setCollecting(false);
    if (updated) setScreen({ name: 'detail', parcelId: item.id });
  }

  const grouped = groupRecipientParcels(parcels);
  const title = t(titleKey);

  if (screen.name === 'list') {
    return (
      <ScreenScaffold title={title}>
        <View style={styles.listContainer}>
          {isGuest ? (
            <ScrollView contentContainerStyle={styles.listContent}>
              <SearchBox
                styles={styles}
                colors={colors}
                trackingNumber={trackingNumber}
                tracking={tracking}
                error={error}
                onChange={setTrackingNumber}
                onSubmit={() => void handleTrack()}
              />
              <AuthRequired
                title={t('authGate.receiveTitle')}
                message={t('authGate.receiveMessage')}
                onSignIn={() => onRequestAuth?.()}
                onSignUp={() => onRequestAuth?.()}
              />
            </ScrollView>
          ) : loading && !refreshing ? (
            <AppSpinner />
          ) : error && parcels.length === 0 ? (
            <View style={styles.feedback}>
              <Text style={styles.error}>{error}</Text>
              <PrimaryButton label={t('common.retry')} onPress={() => void loadList()} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    void loadList(true);
                  }}
                  tintColor={colors.secondary}
                />
              }
            >
              <SearchBox
                styles={styles}
                colors={colors}
                trackingNumber={trackingNumber}
                tracking={tracking}
                error={error}
                onChange={setTrackingNumber}
                onSubmit={() => void handleTrack()}
              />
              {unreadCount > 0 ? (
                <Pressable onPress={onOpenNotifications} style={styles.notificationPreview}>
                  <Text style={styles.notificationPreviewLabel}>
                    {t('home.alerts', { count: unreadCount })}
                  </Text>
                </Pressable>
              ) : null}
              <ParcelSection
                title="À faire"
                items={grouped.action}
                empty="Aucune action requise pour le moment."
                styles={styles}
                onOpen={(item) => {
                  setError(null);
                  setScreen({ name: 'detail', parcelId: item.id });
                }}
              />
              <ParcelSection
                title="En cours"
                items={grouped.progress}
                empty="Aucun colis en cours."
                styles={styles}
                onOpen={(item) => setScreen({ name: 'detail', parcelId: item.id })}
              />
              <ParcelSection
                title="Récents"
                items={grouped.recent}
                empty="Aucun colis récent."
                styles={styles}
                onOpen={(item) => setScreen({ name: 'detail', parcelId: item.id })}
              />
              {parcels.length === 0 ? (
                <EmptyState
                  title="Aucun colis"
                  message="Les colis qui vous sont destinés apparaîtront ici."
                />
              ) : null}
            </ScrollView>
          )}
        </View>
      </ScreenScaffold>
    );
  }

  if (screen.name === 'payment' && parcel && parcel.id === screen.parcelId) {
    return (
      <PaymentScreen
        parcel={parcel}
        styles={styles}
        colors={colors}
        error={error}
        paymentMessage={paymentMessage}
        paymentProviders={paymentProviders}
        selectedProvider={selectedProvider}
        paymentPhone={paymentPhone}
        paying={paying}
        onBack={goBack}
        onProvider={setSelectedProvider}
        onPhone={setPaymentPhone}
        onDismissMessage={() => setPaymentMessage(null)}
        onPay={() => {
          setPaying(true);
          setError(null);
          void initiatePickupPayment(parcel.id, {
            provider: selectedProvider,
            phoneNumber: paymentPhone.trim(),
          }).then((result) => {
            setPaying(false);
            const next = applyRecipientMutationResult(parcel, result);
            if (!next.succeeded) {
              setError(next.error);
              return;
            }
            setParcel(next.value);
            if (canShowCollectionCode(next.value)) {
              setScreen({ name: 'pickup', parcelId: parcel.id });
              return;
            }
            setPaymentMessage(
              'Demande de paiement envoyée. Confirmez sur votre téléphone si demandé.',
            );
          });
        }}
      />
    );
  }

  if (screen.name === 'pickup' && parcel && parcel.id === screen.parcelId) {
    return (
      <PickupScreen
        parcel={parcel}
        styles={styles}
        error={error}
        collecting={collecting}
        pinCopied={pinCopied}
        onBack={goBack}
        onCopy={() => {
          if (!parcel.pickupPin) return;
          void Clipboard.setStringAsync(parcel.pickupPin).then(() => setPinCopied(true));
        }}
        onCollect={() => void handleCollect(parcel)}
        onPay={() => setScreen({ name: 'payment', parcelId: parcel.id })}
      />
    );
  }

  if (screen.name === 'report' && parcel && parcel.id === screen.parcelId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
        <ScreenHeader mode="CLIENT" title={t('customer.reportIssue')} onBack={goBack} />
        <ReportIssueForm
          allowedTypes={['parcel_problem', 'locker_unavailable', 'locker_system']}
          onSubmit={async (input) => {
            const result = await reportCustomerIssue({
              ...input,
              parcelId: parcel.id,
              lockerId: parcel.locker?.id,
            });
            return result.success ? null : translateRecipientError(result.error);
          }}
          onSuccess={() => {
            setIssueSuccess('Signalement envoyé — notre équipe vous contactera si nécessaire.');
            setScreen({ name: 'detail', parcelId: parcel.id });
          }}
          onCancel={goBack}
        />
      </ScrollView>
    );
  }

  if (screen.name === 'return-request' && parcel && parcel.id === screen.parcelId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
        <ScreenHeader mode="CLIENT" title="Demander un retour" onBack={goBack} />
        <Text style={styles.stepTitle}>Demander un retour</Text>
        <Text style={styles.detailSubtext}>
          Vous souhaitez retourner ce colis à l’entreprise ?
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label="Confirmer la demande"
          variant="brand"
          loading={collecting}
          onPress={() => void handleRequestReturn(parcel)}
        />
      </ScrollView>
    );
  }

  if (screen.name === 'return-instructions' && parcel && parcel.id === screen.parcelId) {
    const ret = parcel.customerReturn;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
        <ScreenHeader mode="CLIENT" title="Déposer le retour" onBack={goBack} />
        <Text style={styles.stepTitle}>Déposer le retour</Text>
        <Text style={styles.detailText}>
          Casier Eveider {ret?.returnLocker?.name ?? parcel.locker?.name ?? '—'}
        </Text>
        <Text style={styles.detailSubtext}>
          {ret?.returnLocker?.address ?? parcel.locker?.address ?? ''}
        </Text>
        {ret?.returnCode ? (
          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>Code de retour</Text>
            <Text style={styles.pinCode}>{ret.returnCode}</Text>
          </View>
        ) : null}
        <Text style={styles.detailSubtext}>Au casier Eveider :</Text>
        <Text style={styles.detailSubtext}>1. Saisissez votre numéro de téléphone.</Text>
        <Text style={styles.detailSubtext}>2. Saisissez le numéro de suivi.</Text>
        <Text style={styles.detailSubtext}>3. Saisissez votre code de retour.</Text>
        <Text style={styles.detailSubtext}>4. Déposez le colis dans le compartiment ouvert.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {ret?.canDeposit ? (
          <View style={styles.standIn}>
            <Text style={styles.kicker}>Mode de secours</Text>
            <Text style={styles.detailSubtext}>
              Le terminal du casier confirmera le dépôt une fois le matériel en service. Utilisez
              cette action uniquement si vous avez déjà déposé le retour.
            </Text>
            <PrimaryButton
              label="Confirmer le dépôt retour"
              variant="secondary"
              loading={collecting}
              onPress={() => void handleConfirmReturnDeposit(parcel)}
            />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  if (loading && !parcel) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="CLIENT" title={t('customer.parcelDetail')} onBack={goBack} />
        <AppSpinner />
      </View>
    );
  }

  if (error && !parcel) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="CLIENT" title={t('customer.parcelDetail')} onBack={goBack} />
        <Text style={styles.error}>{error}</Text>
        <PrimaryButton label={t('common.retry')} onPress={goBack} />
      </View>
    );
  }

  if (!parcel) return null;

  const action = getRecipientPrimaryAction(parcel);
  const detail = getRecipientStatusDetail(parcel);
  const locker = parcel.customerReturn?.returnLocker ?? parcel.locker;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
      <ScreenHeader mode="CLIENT" title={getRecipientParcelStatus(parcel)} onBack={goBack} />
      {issueSuccess ? (
        <SuccessBanner message={issueSuccess} onDismiss={() => setIssueSuccess(null)} />
      ) : null}
      <View style={styles.detailHeader}>
        <Text style={styles.detailReference}>{parcel.trackingNumber}</Text>
        <ParcelStatusBadge parcel={parcel} />
      </View>
      <Text style={styles.detailMeta}>{parcel.businessName}</Text>
      {parcel.reference ? <Text style={styles.detailSubtext}>Réf. {parcel.reference}</Text> : null}
      <Text style={styles.stepTitle}>{getRecipientParcelStatus(parcel)}</Text>
      {detail ? <Text style={styles.detailSubtext}>{detail}</Text> : null}

      <View style={styles.detailSection}>
        <Text style={styles.sectionLabel}>Parcours</Text>
        <ParcelTimeline parcel={parcel} />
      </View>

      {locker ? (
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>Casier Eveider</Text>
          <Text style={styles.detailText}>{locker.name}</Text>
          <Text style={styles.detailSubtext}>{locker.address}</Text>
          {parcel.status === 'ready_for_pickup' &&
          canShowCollectionCode(parcel) &&
          parcel.compartmentLabel ? (
            <Text style={styles.detailSubtext}>Compartiment {parcel.compartmentLabel}</Text>
          ) : null}
          <Pressable
            onPress={() => openCasierDirections(parcel)}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>Itinéraire</Text>
          </Pressable>
        </View>
      ) : null}

      {hasMissingCanonicalCharge(parcel.pickupPayment) ? (
        <Text style={styles.error}>
          Les frais de ce colis ne sont pas encore disponibles. Le code de retrait reste masqué.
          Contactez le support Eveider.
        </Text>
      ) : null}

      {isPaymentProviderUnavailable(parcel) ? (
        <Text style={styles.error}>
          Le paiement est requis, mais le prestataire est indisponible pour le moment. Réessayez.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {action.id && action.id !== 'support_charge' ? (
        <PrimaryButton
          label={action.label}
          variant="brand"
          onPress={() => openPrimaryAction(parcel)}
        />
      ) : null}

      {parcel.customerReturn?.status === 'requested' && parcel.customerReturn.canCancel ? (
        <Pressable onPress={() => void handleCancelReturn(parcel)} style={styles.reportButton}>
          <Text style={styles.reportButtonText}>Annuler la demande</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => setScreen({ name: 'report', parcelId: parcel.id })}
        style={styles.reportButton}
      >
        <Text style={styles.reportButtonText}>{t('customer.reportIssue')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SearchBox({
  styles,
  colors,
  trackingNumber,
  tracking,
  error,
  onChange,
  onSubmit,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: ColorTokens;
  trackingNumber: string;
  tracking: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.search}>
      <Text style={styles.sectionTitle}>Rechercher un colis</Text>
      <View style={styles.trackRow}>
        <TextInput
          value={trackingNumber}
          onChangeText={onChange}
          placeholder="Numéro de suivi"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          style={styles.trackInput}
        />
        <Pressable onPress={onSubmit} style={styles.trackButton} accessibilityRole="button">
          {tracking ? <AppSpinner size="sm" color={colors.onPrimary} /> : <Feather name="search" size={18} color={colors.onPrimary} />}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function ParcelSection({
  title,
  items,
  empty,
  styles,
  onOpen,
}: {
  title: string;
  items: CustomerParcel[];
  empty: string;
  styles: ReturnType<typeof createStyles>;
  onOpen: (item: CustomerParcel) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyMessage}>{empty}</Text>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item)} style={styles.cardWrap}>
            <ParcelCard parcel={item} />
          </Pressable>
        ))
      )}
    </View>
  );
}

function PaymentScreen({
  parcel,
  styles,
  colors,
  error,
  paymentMessage,
  paymentProviders,
  selectedProvider,
  paymentPhone,
  paying,
  onBack,
  onProvider,
  onPhone,
  onDismissMessage,
  onPay,
}: {
  parcel: CustomerParcel;
  styles: ReturnType<typeof createStyles>;
  colors: ColorTokens;
  error: string | null;
  paymentMessage: string | null;
  paymentProviders: PaymentProvider[];
  selectedProvider: string;
  paymentPhone: string;
  paying: boolean;
  onBack: () => void;
  onProvider: (id: string) => void;
  onPhone: (value: string) => void;
  onDismissMessage: () => void;
  onPay: () => void;
}) {
  const fee =
    parcel.pickupPayment?.amount && parcel.pickupPayment.currency
      ? `${parcel.pickupPayment.amount} ${parcel.pickupPayment.currency}`
      : '—';
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
      <ScreenHeader mode="CLIENT" title="Payer les frais" onBack={onBack} />
      {paymentMessage ? <SuccessBanner message={paymentMessage} onDismiss={onDismissMessage} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.stepTitle}>Votre colis est prêt.</Text>
      <Text style={styles.detailSubtext}>Frais à payer</Text>
      <Text style={styles.detailReference}>{fee}</Text>
      <Text style={styles.detailSubtext}>
        Le code de retrait s’affiche après confirmation du paiement.
      </Text>
      {paymentProviders.length === 0 ? (
        <Text style={styles.error}>
          Le prestataire de paiement est indisponible. Les frais restent dus. Réessayez plus tard.
        </Text>
      ) : (
        paymentProviders.map((provider) => (
          <Pressable
            key={provider.id}
            onPress={() => onProvider(provider.id)}
            style={[
              styles.providerOption,
              selectedProvider === provider.id && styles.providerOptionSelected,
            ]}
          >
            <Text style={styles.providerOptionText}>{provider.label}</Text>
          </Pressable>
        ))
      )}
      <TextInput
        value={paymentPhone}
        onChangeText={onPhone}
        placeholder="+243800000000"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        style={styles.phoneInput}
      />
      <PrimaryButton
        label="Payer les frais"
        variant="brand"
        disabled={paying || !selectedProvider || !paymentPhone.trim()}
        loading={paying}
        onPress={onPay}
      />
    </ScrollView>
  );
}

function PickupScreen({
  parcel,
  styles,
  error,
  collecting,
  pinCopied,
  onBack,
  onCopy,
  onCollect,
  onPay,
}: {
  parcel: CustomerParcel;
  styles: ReturnType<typeof createStyles>;
  error: string | null;
  collecting: boolean;
  pinCopied: boolean;
  onBack: () => void;
  onCopy: () => void;
  onCollect: () => void;
  onPay: () => void;
}) {
  if (needsRecipientPayment(parcel) || !canShowCollectionCode(parcel)) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="CLIENT" title="Code de retrait" onBack={onBack} />
        <Text style={styles.detailSubtext}>
          {needsRecipientPayment(parcel)
            ? 'Le paiement est requis avant d’afficher le code de retrait.'
            : 'Le code de retrait n’est pas encore disponible.'}
        </Text>
        {needsRecipientPayment(parcel) ? (
          <PrimaryButton label="Payer les frais" variant="brand" onPress={onPay} />
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
      <ScreenHeader mode="CLIENT" title="Code de retrait" onBack={onBack} />
      <View style={styles.pinCard}>
        <Text style={styles.pinLabel}>Code de retrait</Text>
        <Text style={styles.pinCode}>{parcel.pickupPin}</Text>
        <Pressable onPress={onCopy} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>{pinCopied ? 'Code copié' : 'Copier le code'}</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionLabel}>Au casier Eveider :</Text>
      <Text style={styles.detailSubtext}>1. Saisissez votre numéro de téléphone.</Text>
      <Text style={styles.detailSubtext}>2. Saisissez le numéro de suivi.</Text>
      <Text style={styles.detailSubtext}>3. Saisissez votre code de retrait.</Text>
      <Text style={styles.detailSubtext}>4. Récupérez votre colis.</Text>
      {parcel.locker ? (
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>Casier Eveider</Text>
          <Text style={styles.detailText}>{parcel.locker.name}</Text>
          <Text style={styles.detailSubtext}>{parcel.locker.address}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <CommissioningCollectConfirm loading={collecting} onConfirm={onCollect} />
    </ScrollView>
  );
}

function openCasierDirections(parcel: CustomerParcel) {
  const locker = parcel.customerReturn?.returnLocker ?? parcel.locker;
  if (!locker) return;
  const full = parcel.locker;
  if (full?.latitude != null && full.longitude != null && full.id === locker.id) {
    openDirections(full.latitude, full.longitude, locker.name);
    return;
  }
  openAddressSearch(`Casier Eveider ${locker.name} ${locker.address}`);
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    listContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 0,
      backgroundColor: colors.background,
      ...(Platform.OS === 'web'
        ? ({ scrollbarWidth: 'none', msOverflowStyle: 'none' } as const)
        : null),
    },
    detailContent: {
      paddingBottom: 40,
    },
    scroll: { flex: 1 },
    listContent: {
      flexGrow: 1,
      paddingBottom: 24,
      gap: 20,
    },
    search: { gap: 8 },
    trackRow: { flexDirection: 'row', gap: 8 },
    trackInput: {
      flex: 1,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    trackButton: {
      width: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    emptyMessage: {
      fontWeight: '500',
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 8,
    },
    cardWrap: { marginBottom: 12 },
    feedback: { gap: 12 },
    error: {
      color: colors.danger,
      fontWeight: '500',
      marginVertical: 12,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    detailReference: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
      flex: 1,
    },
    detailMeta: {
      fontWeight: '500',
      marginBottom: 8,
      color: colors.secondary,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 8,
    },
    detailSection: {
      marginTop: 20,
      marginBottom: 8,
      paddingBottom: 16,
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginBottom: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    detailText: {
      fontWeight: '600',
      color: colors.secondary,
    },
    detailSubtext: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: colors.textMuted,
    },
    pinCard: {
      borderWidth: borders.width,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginVertical: 16,
      backgroundColor: colors.surface,
    },
    pinLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondary,
    },
    pinCode: {
      marginTop: 16,
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: 8,
      color: colors.secondary,
    },
    reportButton: {
      marginTop: 16,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    reportButtonText: {
      fontWeight: '600',
      fontSize: 13,
      color: colors.secondary,
    },
    providerOption: {
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 8,
      backgroundColor: colors.surface,
    },
    providerOptionSelected: {
      borderColor: colors.primary,
    },
    providerOptionText: {
      fontWeight: '600',
      color: colors.secondary,
    },
    phoneInput: {
      marginTop: 12,
      marginBottom: 16,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.secondary,
      backgroundColor: colors.surface,
    },
    secondaryAction: {
      marginTop: 12,
      borderWidth: borders.width,
      borderColor: colors.primary,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    secondaryActionText: {
      fontWeight: '700',
      fontSize: 13,
      color: colors.primary,
    },
    notificationPreview: {
      borderWidth: borders.width,
      borderColor: colors.primary,
      padding: 14,
    },
    notificationPreviewLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    standIn: {
      marginTop: 20,
      borderWidth: borders.width,
      borderColor: colors.border,
      padding: 16,
      backgroundColor: colors.surface,
    },
  });
}
