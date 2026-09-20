import { borders, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops } from '@eveider/domain';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ActionRow } from '../components/ActionRow';
import { AppSpinner } from '../components/AppSpinner';
import { BarcodeScannerCard } from '../components/BarcodeScannerCard';
import { CommissioningLockerDeposit } from '../components/CommissioningLockerDeposit';
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryStepIndicator } from '../components/DeliveryStepIndicator';
import { DispatcherContactButton } from '../components/DispatcherContactButton';
import { DropOffProofCard } from '../components/DropOffProofCard';
import { EmptyState } from '../components/EmptyState';
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
  getDriverDeliveryKindLabel,
  getDriverDeliveryStep,
  getDriverDestination,
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
            : getDriverDeliveryKindLabel(selected ?? { kind: 'outbound' });

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
                emptyTitle={
                  surface === 'history' ? t('courier.historyEmptyTitle') : t('courier.emptyTitle')
                }
                emptyMessage={
                  surface === 'history'
                    ? t('courier.historyEmptyMessage')
                    : t('courier.emptyMessage')
                }
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
  emptyTitle,
  emptyMessage,
  onOpen,
  onContactDispatch,
  onOpenRoute,
}: {
  surface: 'active' | 'history';
  items: CourierDelivery[];
  nextJobId?: string;
  summary: CourierHistorySummary;
  styles: ReturnType<typeof createStyles>;
  emptyTitle: string;
  emptyMessage: string;
  onOpen: (item: CourierDelivery) => void;
  onContactDispatch: () => void;
  onOpenRoute: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {surface === 'history' ? (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>{t('courier.summaryLabel', { days: summary.days })}</Text>
          <Text style={styles.summaryText}>
            {t('courier.summaryText', {
              completed: summary.completed,
              failed: summary.failed,
              rate: summary.successRate,
            })}
          </Text>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <ActionRow icon="message-circle" label={t('courier.contactDispatch')} onPress={onContactDispatch} />
          {items.length > 0 ? (
            <ActionRow icon="navigation" label={t('courier.viewRoute')} onPress={onOpenRoute} last />
          ) : null}
        </View>
      )}

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={`${getDriverDeliveryKindLabel(item)} ${getDriverTrackingLabel(item)}`}
            >
              {surface === 'active' && item.id === nextJobId && index === 0 ? (
                <Text style={styles.nextHint}>{t('courier.nextJob')}</Text>
              ) : null}
              <DeliveryCard delivery={item} highlight={item.id === nextJobId} />
            </Pressable>
          ))}
        </View>
      )}
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
  const kindLabel = getDriverDeliveryKindLabel(delivery);
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
      <Text style={styles.kind}>{kindLabel.toUpperCase()}</Text>
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
    toolbar: {
      marginBottom: 16,
      gap: 0,
    },
    summary: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    summaryText: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textMuted,
    },
    list: {
      gap: 12,
    },
    nextHint: {
      marginBottom: 6,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    kind: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
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
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
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
      borderWidth: borders.width,
      borderColor: colors.border,
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
