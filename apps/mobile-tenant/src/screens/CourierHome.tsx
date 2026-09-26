import { AppSpinner } from '../components/AppSpinner';
import { BarcodeScannerCard } from '../components/BarcodeScannerCard';
import { CommissioningLockerDeposit } from '../components/CommissioningLockerDeposit';
import { CourierHistoryPanel } from '../components/CourierHistoryPanel';
import { DeadlineIndicator } from '../components/DeadlineIndicator';
import { DispatcherContactButton } from '../components/DispatcherContactButton';
import { DriverAvailabilityControl } from '../components/DriverAvailabilityControl';
import { DriverEmptyState } from '../components/DriverEmptyState';
import { DriverHistoryDetail } from '../components/DriverHistoryDetail';
import { DriverInstructionBlock } from '../components/DriverInstructionBlock';
import { DriverSecondaryAction } from '../components/DriverSecondaryAction';
import { DriverTaskRow } from '../components/DriverTaskRow';
import { DropOffProofCard } from '../components/DropOffProofCard';
import { HoldToConfirmButton } from '../components/HoldToConfirmButton';
import {
  LockerMapView,
  openDirections,
  openStopDirections,
} from '../components/LockerMapView';
import { LocationBlock } from '../components/LocationBlock';
import { OperationalTimeline } from '../components/OperationalTimeline';
import { ResolveDestinationModal } from '../components/AddressPlacesField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { ScreenHeader } from '../components/ScreenHeader';
import { NotificationBellHeader } from '../components/NotificationBellHeader';
import { SectionLabel } from '../components/SectionLabel';
import { SuccessBanner } from '../components/SuccessBanner';
import {
  acceptCourierDelivery,
  claimCourierDelivery,
  completeCourierDropOff,
  completeCourierReturnToBusiness,
  confirmCourierPickup,
  fetchCourierAvailableDeliveries,
  fetchCourierDeliveries,
  fetchCourierDriverProfile,
  fetchCourierDropOffProof,
  reportCourierIssue,
  startCourierDelivery,
  startCourierDropOff,
  updateCourierAvailability,
  type CourierClaimableParcel,
  type CourierDelivery,
} from '../lib/api';
import {
  applyDriverMutationResult,
  canDriverActOnDelivery,
  formatDriverClock,
  getDriverCallLabel,
  getDriverCurrentStop,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverInstructions,
  getDriverIssueReasons,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverPackageSizeLabel,
  getDriverPrimaryAction,
  getDriverSuccessCopy,
  getDriverTrackingLabel,
  isActiveDriverDelivery,
  isDeliveryDueToday,
  isHistoryDriverDelivery,
  isHistoricalRts,
  matchesDriverParcelCode,
  sortDeliveriesByDeadline,
  translateDriverError,
} from '../lib/driver-presentation';
import { openDispatcherWhatsApp } from '../lib/support';
import type { CourierStackParamList } from '../navigation/courier-params';
import { useColors } from '../theme';
import { borders, type ColorTokens } from '@eveider/config-ui';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import { Feather } from '@expo/vector-icons';

type CourierScreen = 'list' | 'detail' | 'scan' | 'proof' | 'report' | 'claim';
type TaskSelector = 'today' | 'all' | 'available';

type CourierHomeProps = {
  surface?: 'active' | 'history';
};

export function CourierHome({ surface = 'active' }: CourierHomeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const route = useRoute<RouteProp<{ Home: { deliveryId?: string; focusNonce?: number } }, 'Home'>>();
  const focusDeliveryId = route.params?.deliveryId;
  const focusNonce = route.params?.focusNonce;
  const [screen, setScreen] = useState<CourierScreen>('list');
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [available, setAvailable] = useState<CourierClaimableParcel[]>([]);
  const [selected, setSelected] = useState<CourierDelivery | null>(null);
  const [selectedClaimable, setSelectedClaimable] = useState<CourierClaimableParcel | null>(null);
  const [taskSelector, setTaskSelector] = useState<TaskSelector>('today');
  const [isAcceptingWork, setIsAcceptingWork] = useState(true);
  const [selfAssignmentEnabled, setSelfAssignmentEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; detail: string } | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolveQuery, setResolveQuery] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [deliveriesResult, profileResult, availableResult] = await Promise.all([
      fetchCourierDeliveries(),
      fetchCourierDriverProfile(),
      fetchCourierAvailableDeliveries(),
    ]);
    if (!silent) setLoading(false);
    setRefreshing(false);

    if (!deliveriesResult.success) {
      setError(translateDriverError(deliveriesResult.error));
      return;
    }
    setDeliveries(deliveriesResult.data.deliveries);
    setSelected((current) =>
      current
        ? (deliveriesResult.data.deliveries.find((item) => item.id === current.id) ?? current)
        : null,
    );

    if (profileResult.success) {
      setIsAcceptingWork(Boolean(profileResult.data.isAcceptingWork));
      if (profileResult.data.selfAssignmentEnabled != null) {
        setSelfAssignmentEnabled(Boolean(profileResult.data.selfAssignmentEnabled));
      }
    }

    if (availableResult.success) {
      setSelfAssignmentEnabled(Boolean(availableResult.data.selfAssignmentEnabled));
      setAvailable(availableResult.data.parcels);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusDeliveryId || deliveries.length === 0) return;
    const match = deliveries.find((item) => item.id === focusDeliveryId);
    if (!match) {
      setError('Cette livraison n’est plus disponible.');
      return;
    }
    setSelected(match);
    setSelectedClaimable(null);
    setScreen('detail');
    setError(null);
  }, [focusDeliveryId, focusNonce, deliveries]);

  useEffect(() => {
    if (!selfAssignmentEnabled && taskSelector === 'available') {
      setTaskSelector('today');
    }
  }, [selfAssignmentEnabled, taskSelector]);

  const active = useMemo(
    () => sortDeliveriesByDeadline(deliveries.filter(isActiveDriverDelivery)),
    [deliveries],
  );
  const todayItems = useMemo(() => active.filter((item) => isDeliveryDueToday(item)), [active]);
  const history = useMemo(
    () =>
      deliveries
        .filter(isHistoryDriverDelivery)
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [deliveries],
  );
  const queueItems =
    taskSelector === 'today' ? todayItems : taskSelector === 'all' ? active : [];
  const items = surface === 'history' ? history : queueItems;
  const nextJobId = surface === 'active' && taskSelector !== 'available' ? items[0]?.id : undefined;

  function goList() {
    setScreen('list');
    setSelected(null);
    setSelectedClaimable(null);
    setScanCode('');
    setPhotoBase64(null);
    setError(null);
  }

  function openContextualRoute(deliveryId?: string) {
    navigation.getParent()?.navigate('Route', deliveryId ? { deliveryId } : undefined);
  }

  async function applyAction(
    previous: CourierDelivery,
    result: Awaited<ReturnType<typeof acceptCourierDelivery>>,
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

  async function handleAvailabilityChange(next: boolean) {
    setBusy(true);
    setError(null);
    const result = await updateCourierAvailability(next);
    setBusy(false);
    if (!result.success) {
      setError(translateDriverError(result.error));
      return;
    }
    setIsAcceptingWork(result.data.isAcceptingWork);
  }

  async function handleAccept() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const result = await acceptCourierDelivery(selected.id);
    const next = applyDriverMutationResult(selected, result);
    setBusy(false);
    if (!next.succeeded) {
      setError(next.error);
      return;
    }
    const updated = next.delivery as CourierDelivery;
    setSelected(updated);
    setDeliveries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSuccess({ title: 'Livraison acceptée', detail: 'Vous pouvez maintenant commencer.' });
  }

  async function handleStart() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const result = await startCourierDelivery(selected.id);
    const next = applyDriverMutationResult(selected, result);
    setBusy(false);
    if (!next.succeeded) {
      setError(next.error);
      return;
    }
    const updated = next.delivery as CourierDelivery;
    setSelected(updated);
    setDeliveries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSuccess({
      title: 'Livraison commencée',
      detail: 'Confirmez la prise en charge du colis (scan ou sélection manuelle).',
    });
  }

  async function handleClaim() {
    if (!selectedClaimable || busy) return;
    setBusy(true);
    setError(null);
    const result = await claimCourierDelivery({
      parcelId: selectedClaimable.parcelId,
      kind: selectedClaimable.kind,
    });
    setBusy(false);
    if (!result.success) {
      setError(translateDriverError(result.error));
      return;
    }
    const updated = result.data.delivery;
    setDeliveries((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
    setAvailable((current) =>
      current.filter((item) => item.parcelId !== selectedClaimable.parcelId),
    );
    setSelectedClaimable(null);
    setSelected(updated);
    setTaskSelector('all');
    setScreen('detail');
    setSuccess({ title: 'Livraison prise', detail: 'Acceptez-la pour commencer le parcours.' });
  }

  async function handleConfirmPickup(mode: 'scan' | 'manual', code?: string) {
    if (!selected || busy) return;
    if (mode === 'scan') {
      const value = (code ?? scanCode).trim();
      if (!value) {
        setError('Saisissez le numéro de suivi.');
        return;
      }
      setBusy(true);
      setError(null);
      const result = await confirmCourierPickup(selected.id, { mode: 'scan', reference: value });
      const ok = await applyAction(selected, result, 'scan');
      setBusy(false);
      if (ok) {
        setScanCode('');
        setScreen('detail');
      }
      return;
    }
    setBusy(true);
    setError(null);
    const result = await confirmCourierPickup(selected.id, { mode: 'manual' });
    const ok = await applyAction(selected, result, 'scan');
    setBusy(false);
    if (ok) setScreen('detail');
  }

  async function handleConfirmDeposit(mode: 'scan' | 'manual', code?: string) {
    if (!selected || busy || selected.status !== 'scanned') return;
    if (mode === 'scan') {
      const value = (code ?? scanCode).trim();
      if (!value) {
        setError('Saisissez le numéro de suivi.');
        return;
      }
      if (!matchesDriverParcelCode(selected, value)) {
        setError('Ce colis ne correspond pas à cette livraison. Vérifiez le numéro de suivi.');
        return;
      }
    }
    setBusy(true);
    setError(null);
    const result = await startCourierDropOff(selected.id);
    const ok = await applyAction(selected, result, 'arrive');
    setBusy(false);
    if (ok) {
      setScanCode('');
      setScreen('proof');
    }
  }

  async function handleScan(code: string) {
    if (!selected || busy) return;
    const value = code.trim();
    if (!value) {
      setError('Saisissez le numéro de suivi.');
      return;
    }

    if (selected.status === 'started') {
      await handleConfirmPickup('scan', value);
      return;
    }

    if (selected.status === 'scanned') {
      await handleConfirmDeposit('scan', value);
    }
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
        ? selected?.status === 'scanned'
          ? t('courier.confirmDepositTitle')
          : selected?.status === 'started'
            ? t('courier.confirmPickupTitle')
            : t('courier.scanParcel')
        : screen === 'proof'
          ? 'Preuve de dépôt'
          : screen === 'report'
            ? t('courier.reportIssue')
            : screen === 'claim'
              ? t('courier.taskAvailable')
              : selected && isHistoricalRts(selected)
                ? 'Retour'
                : getDriverMovementLabel(selected ?? { kind: 'outbound', status: 'assigned' });

  return (
    <View style={styles.screen}>
      {screen === 'list' ? (
        <NotificationBellHeader mode="DRIVER" title={headerTitle} />
      ) : (
        <ScreenHeader mode="DRIVER" title={headerTitle} onBack={goList} />
      )}
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
            {success && (screen === 'detail' || screen === 'claim') ? (
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
                available={available}
                taskSelector={taskSelector}
                selfAssignmentEnabled={selfAssignmentEnabled}
                isAcceptingWork={isAcceptingWork}
                availabilityBusy={busy}
                nextJobId={nextJobId}
                styles={styles}
                onTaskSelectorChange={setTaskSelector}
                onAvailabilityChange={(next) => void handleAvailabilityChange(next)}
                onOpen={(item) => {
                  setSelected(item);
                  setSelectedClaimable(null);
                  setError(null);
                  setScreen('detail');
                }}
                onOpenClaimable={(item) => {
                  setSelectedClaimable(item);
                  setSelected(null);
                  setError(null);
                  setScreen('claim');
                }}
                onContactDispatch={() => openDispatcherWhatsApp()}
                onOpenRoute={() => openContextualRoute()}
              />
            ) : null}

            {screen === 'detail' && selected ? (
              <DetailScreen
                delivery={selected}
                busy={busy}
                error={error}
                styles={styles}
                onAccept={() => void handleAccept()}
                onStart={() => void handleStart()}
                onScan={() => {
                  setError(null);
                  setScreen('scan');
                }}
                onManualConfirm={() => void handleConfirmPickup('manual')}
                onConfirmDeposit={() => {
                  setError(null);
                  setScreen('scan');
                }}
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
                onNeedResolve={setResolveQuery}
              />
            ) : null}

            {screen === 'claim' && selectedClaimable ? (
              <ClaimScreen
                parcel={selectedClaimable}
                busy={busy}
                error={error}
                styles={styles}
                onClaim={() => void handleClaim()}
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
                onManualConfirm={
                  selected.status === 'started'
                    ? () => void handleConfirmPickup('manual')
                    : selected.status === 'scanned'
                      ? () => void handleConfirmDeposit('manual')
                      : undefined
                }
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
                reasons={getDriverIssueReasons(selected)}
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
      <ResolveDestinationModal
        open={resolveQuery != null}
        initialQuery={resolveQuery ?? ''}
        onClose={() => setResolveQuery(null)}
        onResolved={(place) => openDirections(place.latitude, place.longitude, place.label)}
      />
    </View>
  );
}

function ListScreen({
  surface,
  items,
  available,
  taskSelector,
  selfAssignmentEnabled,
  isAcceptingWork,
  availabilityBusy,
  nextJobId,
  styles,
  onTaskSelectorChange,
  onAvailabilityChange,
  onOpen,
  onOpenClaimable,
  onContactDispatch,
  onOpenRoute,
}: {
  surface: 'active' | 'history';
  items: CourierDelivery[];
  available: CourierClaimableParcel[];
  taskSelector: TaskSelector;
  selfAssignmentEnabled: boolean;
  isAcceptingWork: boolean;
  availabilityBusy: boolean;
  nextJobId?: string;
  styles: ReturnType<typeof createStyles>;
  onTaskSelectorChange: (value: TaskSelector) => void;
  onAvailabilityChange: (value: boolean) => void;
  onOpen: (item: CourierDelivery) => void;
  onOpenClaimable: (item: CourierClaimableParcel) => void;
  onContactDispatch: () => void;
  onOpenRoute: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  if (surface === 'history') {
    return <CourierHistoryPanel items={items} onOpen={onOpen} />;
  }

  const showingAvailable = taskSelector === 'available';
  const listEmpty = showingAvailable ? available.length === 0 : items.length === 0;
  const selectors: TaskSelector[] = selfAssignmentEnabled
    ? ['today', 'all', 'available']
    : ['today', 'all'];

  return (
    <View>
      <DriverAvailabilityControl
        isAcceptingWork={isAcceptingWork}
        busy={availabilityBusy}
        onChange={onAvailabilityChange}
      />

      <View style={styles.selectorRow}>
        {selectors.map((value) => {
          const active = taskSelector === value;
          const label =
            value === 'today'
              ? t('courier.taskToday')
              : value === 'all'
                ? t('courier.taskAll')
                : t('courier.taskAvailable');
          return (
            <Pressable
              key={value}
              onPress={() => onTaskSelectorChange(value)}
              style={[styles.selectorChip, active && styles.selectorChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.selectorText, active && styles.selectorTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!listEmpty && !showingAvailable ? (
        <View style={styles.queueHeader}>
          <Text style={styles.queueCount}>{t('courier.queueCount', { count: items.length })}</Text>
          <Pressable
            onPress={onOpenRoute}
            hitSlop={8}
            style={styles.queueRouteBtn}
            accessibilityRole="button"
            accessibilityLabel={t('courier.viewRoute')}
          >
            <Feather name="navigation" size={14} color={colors.primary} />
            <Text style={styles.queueRoute}>{t('courier.viewRoute')}</Text>
          </Pressable>
        </View>
      ) : null}

      {listEmpty ? (
        <DriverEmptyState
          compact
          title={
            showingAvailable
              ? t('courier.emptyAvailableTitle')
              : taskSelector === 'today'
                ? t('courier.emptyTodayTitle')
                : t('courier.emptyTitle')
          }
          message={
            showingAvailable
              ? t('courier.emptyAvailableMessage')
              : taskSelector === 'today'
                ? t('courier.emptyTodayMessage')
                : t('courier.emptyMessage')
          }
          actionLabel={t('courier.contactDispatch')}
          onAction={onContactDispatch}
        />
      ) : showingAvailable ? (
        <View style={styles.list}>
          {available.map((item) => (
            <DriverTaskRow
              key={item.parcelId}
              claimable={item}
              onPress={() => onOpenClaimable(item)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <DriverTaskRow
              key={item.id}
              delivery={item}
              highlight={item.id === nextJobId}
              onPress={() => onOpen(item)}
            />
          ))}
        </View>
      )}

      {!listEmpty ? (
        <DriverSecondaryAction
          label={t('courier.contactDispatch')}
          onPress={onContactDispatch}
          variant="quiet"
          icon="message-circle"
        />
      ) : null}
    </View>
  );
}

function ClaimScreen({
  parcel,
  busy,
  error,
  styles,
  onClaim,
}: {
  parcel: CourierClaimableParcel;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  const isReturn = parcel.kind === 'customer_return' || parcel.kind === 'return';
  const typeLabel = isReturn ? 'Retour' : 'Collecte';
  const routeLabel = isReturn
    ? [
        parcel.lockerName ? `Casier ${parcel.lockerName}` : parcel.lockerAddress,
        parcel.businessName,
      ]
        .filter(Boolean)
        .join(' → ')
    : [
        parcel.senderAddress || parcel.businessName,
        parcel.lockerName ? `Casier ${parcel.lockerName}` : null,
      ]
        .filter(Boolean)
        .join(' → ');

  return (
    <View style={styles.gap}>
      <Text style={styles.taskKicker}>{t('courier.taskAvailable')}</Text>
      <Text style={styles.stepTitle}>
        {typeLabel}
        <Text style={styles.stepDetail}> · {parcel.trackingNumber}</Text>
      </Text>
      <Text style={styles.stepDetail}>{routeLabel}</Text>
      <DeadlineIndicator dueAt={parcel.dueAt} />
      <DriverInstructionBlock instructions={parcel.driverInstructions} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <HoldToConfirmButton label={t('courier.holdToClaim')} onConfirm={onClaim} loading={busy} />
    </View>
  );
}

function DetailScreen({
  delivery,
  busy,
  error,
  styles,
  onAccept,
  onStart,
  onScan,
  onManualConfirm,
  onConfirmDeposit,
  onProof,
  onHandoff,
  onReport,
  onOpenProof,
  onNeedResolve,
}: {
  delivery: CourierDelivery;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onAccept: () => void;
  onStart: () => void;
  onScan: () => void;
  onManualConfirm: () => void;
  onConfirmDeposit: () => void;
  onProof: () => void;
  onHandoff: () => void;
  onReport: () => void;
  onOpenProof: () => void;
  onNeedResolve: (query: string) => void;
}) {
  const { t } = useTranslation();
  const current = getDriverCurrentStop(delivery);
  const isRecord =
    isHistoryDriverDelivery(delivery) || isHistoricalRts(delivery);

  if (isRecord) {
    return (
      <DriverHistoryDetail
        delivery={delivery}
        onOpenMaps={() => openStop(current, onNeedResolve)}
        onOpenProof={delivery.hasDropOffPhoto ? onOpenProof : undefined}
      />
    );
  }

  const step = getDriverDeliveryStep(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const action = getDriverPrimaryAction(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const sizeLabel = getDriverPackageSizeLabel(delivery.parcel.packageSize);
  const canAct = canDriverActOnDelivery(delivery);
  const instructions = getDriverInstructions(delivery);
  const locker = delivery.parcel.locker;
  const pickupPhase =
    step.id === 'awaiting_accept' ||
    step.id === 'ready_to_start' ||
    step.id === 'confirm_pickup' ||
    step.id === 'awaiting_business_pickup' ||
    step.id === 'awaiting_locker_pickup';
  const depositPhase = step.id === 'locker_deposit';
  const transportPhase = step.id === 'en_route_locker' || step.id === 'returning_to_business';
  const primaryPlace = pickupPhase ? origin : destination;
  const secondaryPlace = pickupPhase ? destination : origin;
  const mapPins =
    primaryPlace.latitude != null && primaryPlace.longitude != null
      ? [
          {
            id: delivery.id,
            name: primaryPlace.name,
            address: primaryPlace.address ?? '',
            latitude: primaryPlace.latitude,
            longitude: primaryPlace.longitude,
            availableCompartments: 0,
          },
        ]
      : [];

  const compartmentLabel = depositPhase
    ? delivery.parcel.compartmentLabel
      ? delivery.parcel.compartmentLabel
      : 'à définir'
    : delivery.parcel.compartmentLabel &&
        delivery.status !== 'assigned' &&
        delivery.status !== 'accepted'
      ? delivery.parcel.compartmentLabel
      : transportPhase && !delivery.parcel.compartmentLabel
        ? 'à définir'
        : null;

  const pickupClock = formatDriverClock(delivery.scannedAt);
  const originFootnote =
    !pickupPhase && delivery.status !== 'assigned' && delivery.status !== 'accepted'
      ? pickupClock
        ? `✓ Prise en charge confirmée · ${pickupClock}`
        : '✓ Prise en charge confirmée'
      : null;

  const secondaryTitle =
    transportPhase || depositPhase || step.id === 'business_handoff'
      ? 'Collecté à'
      : 'Destination';

  return (
    <View>
      <OperationalTimeline status={delivery.status} kind={delivery.kind} />

      <View style={styles.explanationBlock}>
        <Text style={styles.stepTitle}>{step.label}</Text>
        <Text style={styles.stepDetail}>{step.detail}</Text>
        <DeadlineIndicator dueAt={delivery.dueAt} />
      </View>

      <DriverInstructionBlock instructions={instructions} />

      <LocationBlock
        title={pickupPhase ? 'Origine' : 'Destination'}
        place={primaryPlace}
        emphasize={canAct}
        hideAction
        compartmentLabel={pickupPhase ? null : compartmentLabel}
      />

      {depositPhase && locker ? (
        <CommissioningLockerDeposit
          mode="note"
          lockerName={destination.name}
          lockerAddress={destination.address}
        />
      ) : null}

      {!depositPhase ? (
        mapPins.length > 0 ? (
          <View style={styles.mapAttach}>
            <View style={styles.mapWrap}>
              <Pressable
                onPress={() => openStop(primaryPlace, onNeedResolve)}
                accessibilityRole="button"
                accessibilityLabel={t('courier.openMaps')}
              >
                <LockerMapView lockers={mapPins} height={180} />
              </Pressable>
            </View>
            <PrimaryButton
              label={t('courier.openMaps')}
              onPress={() => openStop(primaryPlace, onNeedResolve)}
              variant="secondary"
            />
          </View>
        ) : (
          <View style={styles.mapAttach}>
            <PrimaryButton
              label={t('courier.openMaps')}
              onPress={() => openStop(primaryPlace, onNeedResolve)}
              variant="secondary"
            />
          </View>
        )
      ) : null}

      <View style={styles.detailSection}>
        <SectionLabel>Colis</SectionLabel>
        <Text style={styles.tracking}>{tracking}</Text>
        <Text style={styles.muted}>
          {[
            sizeLabel,
            delivery.parcel.recipientName
              ? `Destinataire · ${delivery.parcel.recipientName}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <LocationBlock
        title={pickupPhase ? 'Destination' : secondaryTitle}
        place={secondaryPlace}
        secondary
        hideAction
        footnote={pickupPhase ? null : originFootnote}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {action.id === 'accept_delivery' ? (
        <HoldToConfirmButton
          label={t('courier.holdToAccept')}
          onConfirm={onAccept}
          loading={busy}
        />
      ) : null}

      {action.id === 'start_delivery' ? (
        <HoldToConfirmButton label={t('courier.holdToStart')} onConfirm={onStart} loading={busy} />
      ) : null}

      {action.id === 'confirm_pickup' ? (
        <View style={styles.confirmStack}>
          <Text style={styles.scanHint}>{t('courier.scanOptionalHint')}</Text>
          <PrimaryButton
            label={t('courier.scanParcel')}
            onPress={onScan}
            loading={busy}
            variant="brand"
          />
          <PrimaryButton
            label={t('courier.selectManually')}
            onPress={onManualConfirm}
            loading={busy}
            variant="secondary"
          />
        </View>
      ) : null}

      {action.id === 'confirm_deposit' ? (
        <PrimaryButton
          label={action.label}
          onPress={onConfirmDeposit}
          loading={busy}
          variant="brand"
        />
      ) : null}

      {action.id === 'commissioning_deposit_proof' ? (
        <PrimaryButton label={action.label} onPress={onProof} variant="brand" />
      ) : null}

      {action.id === 'confirm_business_handoff' ? (
        <PrimaryButton label={action.label} onPress={onHandoff} loading={busy} variant="brand" />
      ) : null}

      <View style={styles.secondaryStack}>
        {action.id === 'confirm_deposit' ? (
          <DriverSecondaryAction
            label={t('courier.scanParcelOptional')}
            onPress={onScan}
            icon="maximize"
          />
        ) : null}

        {primaryPlace.contactPhone ? (
          <DriverSecondaryAction
            label={getDriverCallLabel(primaryPlace)}
            onPress={() => openPhone(primaryPlace.contactPhone!)}
            icon="phone"
          />
        ) : null}

        {delivery.hasDropOffPhoto ? (
          <DriverSecondaryAction label="Voir la preuve de dépôt" onPress={onOpenProof} icon="image" />
        ) : null}

        {canAct ? (
          <DriverSecondaryAction
            label={t('courier.reportIssue')}
            onPress={onReport}
            icon="alert-triangle"
          />
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
  onManualConfirm,
}: {
  delivery: CourierDelivery;
  scanCode: string;
  busy: boolean;
  error: string | null;
  styles: ReturnType<typeof createStyles>;
  onChangeCode: (value: string) => void;
  onScan: (value: string) => void;
  onManualConfirm?: () => void;
}) {
  const { t } = useTranslation();
  const action = getDriverPrimaryAction(delivery);
  const stop = getDriverCurrentStop(delivery);
  const atLocker = action.id === 'confirm_deposit' || delivery.status === 'scanned';
  const confirmingPickup = delivery.status === 'started';
  return (
    <View style={styles.gap}>
      <Text style={styles.taskKicker}>{t('courier.currentTask')}</Text>
      <Text style={styles.stepTitle}>
        {confirmingPickup
          ? t('courier.confirmPickupTitle')
          : atLocker
            ? t('courier.confirmDepositTitle')
            : getDriverDeliveryStep(delivery).label}
      </Text>
      <Text style={styles.stepDetail}>
        {confirmingPickup || atLocker
          ? t('courier.scanOptionalHint')
          : `${stop.action} · ${stop.name}`}
      </Text>
      <Text style={styles.tracking}>{getDriverTrackingLabel(delivery)}</Text>
      <BarcodeScannerCard onScan={onScan} />
      <SectionLabel>{t('courier.enterTracking')}</SectionLabel>
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
      {onManualConfirm ? (
        <PrimaryButton
          label={t('courier.selectManually')}
          onPress={onManualConfirm}
          loading={busy}
          variant="secondary"
        />
      ) : null}
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

function openStop(
  place: ReturnType<typeof getDriverCurrentStop>,
  onNeedResolve: (query: string) => void,
) {
  openStopDirections({
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name,
    address: place.address,
    onNeedResolve,
  });
}

function openPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return;
  void Linking.openURL(`tel:${cleaned}`);
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
    selectorRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 3,
      marginBottom: 16,
      gap: 2,
    },
    selectorChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    selectorChipActive: {
      backgroundColor: colors.successMuted,
    },
    selectorText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    selectorTextActive: {
      color: colors.successFg,
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
      flex: 1,
    },
    queueRouteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    queueRoute: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    list: {
      gap: 8,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      marginTop: 4,
    },
    detailReference: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.secondary,
      flex: 1,
      fontVariant: ['tabular-nums'],
    },
    detailMeta: {
      fontWeight: '500',
      marginBottom: 6,
      color: colors.textMuted,
      fontSize: 14,
    },
    explanationBlock: {
      marginTop: 4,
      marginBottom: 12,
    },
    taskKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 6,
    },
    stepDetail: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400',
      color: colors.textMuted,
      marginBottom: 8,
    },
    detailSection: {
      marginTop: 16,
      marginBottom: 12,
      paddingBottom: 16,
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
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
    mapAttach: {
      marginTop: -4,
      marginBottom: 8,
      gap: 8,
    },
    mapWrap: {
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    secondaryStack: {
      marginTop: 12,
      gap: 8,
    },
    confirmStack: {
      gap: 10,
      marginTop: 4,
    },
    scanHint: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
      marginVertical: 12,
    },
    whatsapp: {
      marginTop: 8,
    },
    gap: {
      gap: 12,
    },
    input: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondary,
    },
  });
}
