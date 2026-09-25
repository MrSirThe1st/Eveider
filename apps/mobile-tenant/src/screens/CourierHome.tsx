import { ActionRow } from '../components/ActionRow';
import { AppSpinner } from '../components/AppSpinner';
import { BarcodeScannerCard } from '../components/BarcodeScannerCard';
import { CommissioningLockerDeposit } from '../components/CommissioningLockerDeposit';
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryStepIndicator } from '../components/DeliveryStepIndicator';
import { DispatcherContactButton } from '../components/DispatcherContactButton';
import { DropOffProofCard } from '../components/DropOffProofCard';
import {
  LockerMapView,
  openAddressSearch,
  openDirections,
} from '../components/LockerMapView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { ScreenHeader } from '../components/ScreenHeader';
import { SuccessBanner } from '../components/SuccessBanner';
import {
  completeCourierDropOff,
  completeCourierReturnToBusiness,
  fetchCourierDeliveries,
  fetchCourierDropOffProof,
  reportCourierIssue,
  scanCourierDelivery,
  startCourierDropOff,
  type CourierDelivery,
  type CourierHistorySummary,
} from '../lib/api';
import {
  applyDriverMutationResult,
  canDriverActOnDelivery,
  getDriverCurrentStop,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverPackageSizeLabel,
  getDriverPrimaryAction,
  getDriverSuccessCopy,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
  isHistoryDriverDelivery,
  isHistoricalRts,
  translateDriverError,
} from '../lib/driver-presentation';
import { openDispatcherWhatsApp } from '../lib/support';
import type { CourierStackParamList } from '../navigation/courier-params';
import { useColors } from '../theme';
import { radius, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { orderLockerStops } from '@eveider/domain';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const BOX_EMPTY = require('../assets/boxIllustration.png');
const EMPTY_SUMMARY: CourierHistorySummary = {
  days: 90,
  completed: 0,
  failed: 0,
  successRate: 0,
};

type CourierScreen = 'list' | 'detail' | 'scan' | 'proof' | 'report';

type CourierHomeProps = {
  surface?: 'active' | 'history';
};

export function CourierHome({ surface = 'active' }: CourierHomeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const [screen, setScreen] = useState<CourierScreen>('list');
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [summary, setSummary] = useState<CourierHistorySummary>(EMPTY_SUMMARY);
  const [selected, setSelected] = useState<CourierDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; detail: string } | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setSummary(result.data.summary ?? EMPTY_SUMMARY);
    setSelected((current) =>
      current
        ? (result.data.deliveries.find((item) => item.id === current.id) ?? current)
        : null,
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(
    () => sortDeliveriesByRoute(deliveries.filter(isActiveDriverDelivery)),
    [deliveries],
  );
  const history = useMemo(
    () =>
      deliveries
        .filter(isHistoryDriverDelivery)
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [deliveries],
  );
  const items = surface === 'history' ? history : active;
  const nextJobId = surface === 'active' ? active[0]?.id : undefined;

  function goList() {
    setScreen('list');
    setSelected(null);
    setScanCode('');
    setPhotoBase64(null);
    setError(null);
  }

  function openContextualRoute(deliveryId?: string) {
    navigation.getParent()?.navigate('Route', deliveryId ? { deliveryId } : undefined);
  }

  async function applyAction(
    previous: CourierDelivery,
    result: Awaited<ReturnType<typeof scanCourierDelivery>>,
    action: 'scan' | 'arrive' | 'deposit' | 'handoff',
  ) {
    const next = applyDriverMutationResult(previous, result);
    if (!next.succeeded) {
      setError(next.error);
      return false;
    }
    const updated = next.delivery as CourierDelivery;
    setSelected(updated);
    setDeliveries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSuccess(getDriverSuccessCopy(updated, action));
    return true;
  }

  async function handleScan(code: string) {
    if (!selected || busy) return;
    const value = code.trim();
    if (!value) {
      setError('Saisissez le numéro de suivi.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await scanCourierDelivery(selected.id, value);
    const ok = await applyAction(selected, result, 'scan');
    setBusy(false);
    if (ok) {
      setScanCode('');
      setScreen('detail');
    }
  }

  async function handleArrive() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const result = await startCourierDropOff(selected.id);
    const ok = await applyAction(selected, result, 'arrive');
    setBusy(false);
    if (ok) setScreen('proof');
  }

  async function handleDepositProof() {
    if (!selected || busy) return;
    if (!photoBase64) {
      setError('Photographiez le dépôt avant de confirmer.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await completeCourierDropOff(selected.id, { photoBase64 });
    const ok = await applyAction(selected, result, 'deposit');
    setBusy(false);
    if (ok) {
      setPhotoBase64(null);
      setScreen('detail');
    }
  }

  async function handleBusinessHandoff() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const result = await completeCourierReturnToBusiness(selected.id);
    const ok = await applyAction(selected, result, 'handoff');
    setBusy(false);
    if (ok) setScreen('detail');
  }

  async function handleOpenExistingProof() {
    if (!selected?.hasDropOffPhoto) return;
    setBusy(true);
    const result = await fetchCourierDropOffProof(selected.id);
    setBusy(false);
    if (!result.success) {
      setError(translateDriverError(result.error));
      return;
    }
    setPhotoBase64(result.data.photo);
    setScreen('proof');
  }

  const headerTitle =
    screen === 'list'
      ? surface === 'history'
        ? t('tabs.history')
        : t('tabs.deliveries')
      : screen === 'scan'
        ? t('courier.scanParcel')
        : screen === 'proof'
          ? 'Preuve de dépôt'
          : screen === 'report'
            ? t('courier.reportIssue')
            : getDriverMovementLabel(selected ?? { kind: 'outbound', status: 'assigned' });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        mode="DRIVER"
        title={headerTitle}
        onBack={screen === 'list' ? undefined : goList}
      />
      {loading && !refreshing ? <AppSpinner /> : null}
      {!loading && error && screen === 'list' ? (
        <View style={styles.body}>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label={t('common.retry')} onPress={() => void load()} />
        </View>
      ) : null}
      {!loading && (screen !== 'list' || !error) ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              screen === 'list' ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    void load(true);
                  }}
                  tintColor={colors.secondary}
                  colors={[colors.primary]}
                  progressBackgroundColor={colors.surface}
                />
              ) : undefined
            }
          >
            {success && screen === 'detail' ? (
              <SuccessBanner
                message={success.title}
                detail={success.detail}
                onDismiss={() => setSuccess(null)}
              />
            ) : null}

            {screen === 'list' ? (
              <ListScreen
                surface={surface}
                items={items}
                nextJobId={nextJobId}
                summary={summary}
                styles={styles}
                onOpen={(item) => {
                  setSelected(item);
                  setError(null);
                  setScreen('detail');
                }}
                onContactDispatch={() => openDispatcherWhatsApp()}
                onOpenRoute={() => openContextualRoute(nextJobId)}
              />
            ) : null}

            {screen === 'detail' && selected ? (
              <DetailScreen
                delivery={selected}
                busy={busy}
                error={error}
                styles={styles}
                onScan={() => {
                  setError(null);
                  setScreen('scan');
                }}
                onArrive={() => void handleArrive()}
                onProof={() => {
                  setError(null);
                  setScreen('proof');
                }}
                onHandoff={() => void handleBusinessHandoff()}
                onReport={() => {
                  setError(null);
                  setScreen('report');
                }}
                onOpenProof={() => void handleOpenExistingProof()}
                onOpenRoute={() => openContextualRoute(selected.id)}
              />
            ) : null}

            {screen === 'scan' && selected ? (
              <ScanScreen
                delivery={selected}
                scanCode={scanCode}
                busy={busy}
                error={error}
                styles={styles}
                onChangeCode={setScanCode}
                onScan={handleScan}
              />
            ) : null}

            {screen === 'proof' && selected ? (
              <ProofScreen
                delivery={selected}
                photoBase64={photoBase64}
                busy={busy}
                error={error}
                styles={styles}
                onCapture={setPhotoBase64}
                onRetake={() => setPhotoBase64(null)}
                onConfirm={() => void handleDepositProof()}
              />
            ) : null}

            {screen === 'report' && selected ? (
              <ReportIssueForm
                allowedTypes={['failed_delivery', 'locker_unavailable', 'parcel_problem']}
                parcelId={selected.parcel.id}
                lockerId={selected.parcel.locker?.id}
                onSubmit={async ({ type, description }) => {
                  const result = await reportCourierIssue({
                    type,
                    description,
                    parcelId: selected.parcel.id,
                    lockerId: selected.parcel.locker?.id,
                  });
                  return result.success ? null : translateDriverError(result.error);
                }}
                onSuccess={() => {
                  setSuccess({
                    title: 'Problème signalé',
                    detail: 'Le dispatch Eveider a bien reçu votre signalement.',
                  });
                  setScreen('detail');
                }}
                onCancel={() => setScreen('detail')}
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

function ListScreen({
  surface,
  items,
  nextJobId,
  summary,
  styles,
  onOpen,
  onContactDispatch,
  onOpenRoute,
}: {
  surface: 'active' | 'history';
  items: CourierDelivery[];
  nextJobId?: string;
  summary: CourierHistorySummary;
  styles: ReturnType<typeof createStyles>;
  onOpen: (item: CourierDelivery) => void;
  onContactDispatch: () => void;
  onOpenRoute: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const totalActivity = summary.completed + summary.failed;
  const isHistory = surface === 'history';
  const isEmpty = items.length === 0;

  return (
    <View>
      {isHistory && !isEmpty ? (
        <View style={styles.summary}>
          {totalActivity === 0 ? (
            <Text style={styles.summaryIdle}>
              {t('courier.summaryIdle', { days: summary.days })}
            </Text>
          ) : (
            <>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{totalActivity}</Text>
                  <Text style={styles.metricLabel}>{t('courier.metricDeliveries')}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{summary.completed}</Text>
                  <Text style={styles.metricLabel}>{t('courier.metricCompleted')}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{summary.failed}</Text>
                  <Text style={styles.metricLabel}>{t('courier.metricIncidents')}</Text>
                </View>
              </View>
              <Text style={styles.summaryRate}>
                {t('courier.summaryRate', {
                  days: summary.days,
                  rate: summary.successRate,
                })}
              </Text>
            </>
          )}
        </View>
      ) : null}

      {!isHistory && !isEmpty ? (
        <View style={styles.queueHeader}>
          <Text style={styles.queueCount}>
            {t('courier.queueCount', { count: items.length })}
          </Text>
          <Pressable
            onPress={onOpenRoute}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('courier.viewRoute')}
          >
            <Text style={styles.queueRoute}>{t('courier.viewRoute')}</Text>
          </Pressable>
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.empty}>
          <Image source={BOX_EMPTY} style={styles.emptyImage} resizeMode="contain" />
          <Text style={styles.emptyTitle}>
            {isHistory ? t('courier.summaryIdle', { days: summary.days }) : t('courier.emptyTitle')}
          </Text>
          <Text style={styles.emptyMessage}>
            {isHistory ? t('courier.historyEmptyMessage') : t('courier.emptyMessage')}
          </Text>
          {!isHistory ? (
            <Pressable
              onPress={onContactDispatch}
              style={styles.dispatchLink}
              accessibilityRole="button"
              accessibilityLabel={t('courier.contactDispatch')}
            >
              <Text style={styles.dispatchLinkText}>{t('courier.contactDispatch')}</Text>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={`${getDriverMovementLabel(item)} ${getDriverTrackingLabel(item)}`}
            >
              {surface === 'active' && item.id === nextJobId && index === 0 ? (
                <Text style={styles.nextHint}>{t('courier.nextJob')}</Text>
              ) : null}
              <DeliveryCard
                delivery={item}
                highlight={item.id === nextJobId}
                variant={isHistory ? 'history' : 'queue'}
              />
            </Pressable>
          ))}
        </View>
      )}

      {!isHistory && !isEmpty ? (
        <Pressable
          onPress={onContactDispatch}
          style={styles.dispatchLinkInline}
          accessibilityRole="button"
          accessibilityLabel={t('courier.contactDispatch')}
        >
          <Text style={styles.dispatchLinkMuted}>{t('courier.contactDispatch')}</Text>
          <Feather name="arrow-right" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function DetailScreen({
  delivery,
  busy,
  error,
  styles,
  onScan,
  onArrive,
  onProof,
  onHandoff,
  onReport,
  onOpenProof,
  onOpenRoute,
}: {
  delivery: CourierDelivery;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onScan: () => void;
  onArrive: () => void;
  onProof: () => void;
  onHandoff: () => void;
  onReport: () => void;
  onOpenProof: () => void;
  onOpenRoute: () => void;
}) {
  const { t } = useTranslation();
  const movement = getDriverMovementLabel(delivery);
  const step = getDriverDeliveryStep(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const current = getDriverCurrentStop(delivery);
  const action = getDriverPrimaryAction(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const sizeLabel = getDriverPackageSizeLabel(delivery.parcel.packageSize);
  const canAct = canDriverActOnDelivery(delivery);
  const locker = delivery.parcel.locker;
  const mapLocker =
    current.latitude != null && current.longitude != null && locker
      ? [
          {
            id: locker.id,
            name: current.name,
            address: current.address ?? locker.address,
            latitude: current.latitude,
            longitude: current.longitude,
            availableCompartments: 0,
          },
        ]
      : [];

  return (
    <View>
      <DeliveryStepIndicator status={delivery.status} kind={delivery.kind} />
      <Text style={styles.kind}>{movement}</Text>
      <Text style={styles.stepTitle}>{step.label}</Text>
      <Text style={styles.stepDetail}>{step.detail}</Text>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Colis</Text>
        <Text style={styles.tracking}>{tracking}</Text>
        {sizeLabel ? <Text style={styles.muted}>{sizeLabel}</Text> : null}
        {delivery.parcel.recipientName ? (
          <Text style={styles.muted}>Destinataire · {delivery.parcel.recipientName}</Text>
        ) : null}
      </View>

      <PlaceBlock title="Origine" place={origin} styles={styles} />
      <Text style={styles.arrow}>↓</Text>
      <PlaceBlock title="Destination" place={destination} styles={styles} />

      {delivery.parcel.compartmentLabel && delivery.status !== 'assigned' ? (
        <Text style={styles.compartment}>
          Compartiment {delivery.parcel.compartmentLabel}
        </Text>
      ) : null}

      {mapLocker.length > 0 ? (
        <View style={styles.mapWrap}>
          <LockerMapView lockers={mapLocker} height={180} />
        </View>
      ) : null}

      <PrimaryButton
        label={t('courier.openMaps')}
        onPress={() => openStop(current)}
        variant="secondary"
      />
      {current.contactPhone ? (
        <>
          <View style={styles.spacer} />
          <PrimaryButton
            label={t('common.call')}
            onPress={() => openPhone(current.contactPhone!)}
            variant="secondary"
          />
        </>
      ) : null}
      <View style={styles.spacer} />
      <ActionRow icon="map" label={t('courier.viewRoute')} onPress={onOpenRoute} last />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {action.id === 'scan_parcel' ? (
        <PrimaryButton label={action.label} onPress={onScan} loading={busy} variant="brand" />
      ) : null}

      {action.id === 'commissioning_arrive_locker' && locker ? (
        <CommissioningLockerDeposit
          mode="arrive"
          lockerName={destination.name}
          lockerAddress={destination.address}
          onArrive={onArrive}
          arriving={busy}
        />
      ) : null}

      {action.id === 'commissioning_deposit_proof' && locker ? (
        <>
          <CommissioningLockerDeposit
            mode="note"
            lockerName={destination.name}
            lockerAddress={destination.address}
          />
          <PrimaryButton label="Photographier le dépôt" onPress={onProof} variant="brand" />
        </>
      ) : null}

      {action.id === 'confirm_business_handoff' ? (
        <PrimaryButton
          label={action.label}
          onPress={onHandoff}
          loading={busy}
          variant="brand"
        />
      ) : null}

      {delivery.hasDropOffPhoto ? (
        <ActionRow icon="image" label="Voir la preuve de dépôt" onPress={onOpenProof} />
      ) : null}

      {canAct ? (
        <ActionRow icon="alert-circle" label={t('courier.reportIssue')} onPress={onReport} last />
      ) : null}

      <View style={styles.whatsapp}>
        <DispatcherContactButton
          context={{
            trackingNumber: tracking,
            lockerName: locker?.name,
            statusLabel: step.label,
          }}
        />
      </View>
    </View>
  );
}

function PlaceBlock({
  title,
  place,
  styles,
}: {
  title: string;
  place: ReturnType<typeof getDriverOrigin>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>{title}</Text>
      <Text style={styles.action}>{place.action}</Text>
      <Text style={styles.placeName}>{place.name}</Text>
      {place.address ? <Text style={styles.muted}>{place.address}</Text> : null}
      {place.contactName || place.contactPhone ? (
        <Text style={styles.muted}>
          {[place.contactName, place.contactPhone].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {place.instructions ? (
        <Text style={styles.muted}>Instructions · {place.instructions}</Text>
      ) : null}
      <Text style={styles.role}>{place.role}</Text>
    </View>
  );
}

function ScanScreen({
  delivery,
  scanCode,
  busy,
  error,
  styles,
  onChangeCode,
  onScan,
}: {
  delivery: CourierDelivery;
  scanCode: string;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onChangeCode: (value: string) => void;
  onScan: (value: string) => void;
}) {
  const { t } = useTranslation();
  const origin = getDriverOrigin(delivery);
  return (
    <View style={styles.gap}>
      <Text style={styles.stepTitle}>{getDriverDeliveryStep(delivery).label}</Text>
      <Text style={styles.muted}>
        {origin.action} · {origin.name}
      </Text>
      <Text style={styles.tracking}>{getDriverTrackingLabel(delivery)}</Text>
      <BarcodeScannerCard onScan={onScan} />
      <Text style={styles.panelLabel}>{t('courier.enterTracking')}</Text>
      <TextInput
        value={scanCode}
        onChangeText={onChangeCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Numéro de suivi"
        placeholderTextColor="#8A8A8A"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={t('courier.scanParcel')}
        onPress={() => onScan(scanCode)}
        loading={busy}
        variant="brand"
      />
    </View>
  );
}

function ProofScreen({
  delivery,
  photoBase64,
  busy,
  error,
  styles,
  onCapture,
  onRetake,
  onConfirm,
}: {
  delivery: CourierDelivery;
  photoBase64: string | null;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onCapture: (value: string) => void;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  const destination = getDriverDestination(delivery);
  const readOnly = delivery.status === 'completed' || isHistoricalRts(delivery);
  return (
    <View style={styles.gap}>
      <CommissioningLockerDeposit
        mode="note"
        lockerName={destination.name}
        lockerAddress={destination.address}
      />
      <DropOffProofCard photoBase64={photoBase64} onCapture={onCapture} onRetake={onRetake} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!readOnly ? (
        <PrimaryButton
          label="Envoyer la preuve de dépôt"
          onPress={onConfirm}
          loading={busy}
          disabled={!photoBase64}
          variant="brand"
        />
      ) : null}
    </View>
  );
}

function openStop(place: ReturnType<typeof getDriverCurrentStop>) {
  if (place.latitude != null && place.longitude != null) {
    openDirections(place.latitude, place.longitude, place.name);
    return;
  }
  const query = [place.name, place.address].filter(Boolean).join(' ');
  if (query) openAddressSearch(query);
}

function openPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return;
  void Linking.openURL(`tel:${cleaned}`);
}

function sortDeliveriesByRoute(items: CourierDelivery[]): CourierDelivery[] {
  const withLocker = items.filter(
    (item) => item.parcel.locker?.latitude != null && item.parcel.locker?.longitude != null,
  );
  const withoutLocker = items.filter(
    (item) => item.parcel.locker?.latitude == null || item.parcel.locker?.longitude == null,
  );
  if (withLocker.length <= 1) return [...withLocker, ...withoutLocker];
  const first = withLocker[0];
  const originLocker = first?.parcel.locker;
  if (!originLocker || originLocker.latitude == null || originLocker.longitude == null) {
    return items;
  }

  const ranked = orderLockerStops(
    { latitude: originLocker.latitude, longitude: originLocker.longitude },
    withLocker.flatMap((item) => {
      const locker = item.parcel.locker;
      if (!locker || locker.latitude == null || locker.longitude == null) return [];
      return [{ id: item.id, latitude: locker.latitude, longitude: locker.longitude }];
    }),
  );
  const byId = new Map(withLocker.map((item) => [item.id, item]));
  return [
    ...ranked.map((stop) => byId.get(stop.id)).filter((item): item is CourierDelivery => Boolean(item)),
    ...withoutLocker,
  ];
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    body: {
      padding: 20,
      gap: 12,
    },
    summary: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    summaryIdle: {
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
    summaryRate: {
      marginTop: 14,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
    },
    queueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    queueCount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondary,
    },
    queueRoute: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    list: {
      gap: 10,
    },
    nextHint: {
      marginBottom: 6,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    empty: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    emptyImage: {
      width: 140,
      height: 110,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
      textAlign: 'center',
    },
    emptyMessage: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    dispatchLink: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dispatchLinkText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    dispatchLinkInline: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    dispatchLinkMuted: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    kind: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: colors.primary,
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.secondary,
    },
    stepDetail: {
      marginTop: 6,
      marginBottom: 16,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 8,
    },
    panelLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    tracking: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
      fontVariant: ['tabular-nums'],
    },
    muted: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
    },
    action: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    placeName: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
    },
    role: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    arrow: {
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      color: colors.textMuted,
      marginVertical: 4,
    },
    compartment: {
      marginTop: 4,
      marginBottom: 12,
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    mapWrap: {
      marginVertical: 12,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    spacer: {
      height: 8,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
      marginVertical: 12,
    },
    whatsapp: {
      marginTop: 20,
    },
    gap: {
      gap: 12,
    },
    input: {
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondary,
    },
  });
}
