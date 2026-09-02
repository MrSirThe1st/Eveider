import { radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops, type DeliveryStatus } from '@eveider/domain';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppSpinner } from '../components/AppSpinner';
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { DeliveryStepIndicator } from '../components/DeliveryStepIndicator';
import { BarcodeScannerCard } from '../components/BarcodeScannerCard';
import { DispatcherContactButton } from '../components/DispatcherContactButton';
import { DropOffProofCard } from '../components/DropOffProofCard';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useHideTabBar } from '../navigation/useHideTabBar';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { SuccessBanner } from '../components/SuccessBanner';
import {
  completeCourierDropOff,
  fetchCourierDeliveries,
  fetchCourierDelivery,
  fetchCourierDropOffProof,
  scanCourierDelivery,
  startCourierDropOff,
  reportCourierIssue,
  type CourierDelivery,
  type CourierHistorySummary,
} from '../lib/api';
import { LockerMapView, getCurrentCoordinates, openDirections } from '../components/LockerMapView';
import { useColors } from '../theme';

type CourierScreen =
  | { name: 'list' }
  | { name: 'detail'; deliveryId: string }
  | { name: 'scan'; deliveryId: string }
  | { name: 'proof'; deliveryId: string }
  | { name: 'report'; deliveryId: string }
  | { name: 'history' };

const ACTIVE_STATUSES: DeliveryStatus[] = ['assigned', 'scanned', 'drop_off_pending'];
const EMPTY_SUMMARY: CourierHistorySummary = {
  days: 90,
  completed: 0,
  failed: 0,
  successRate: 0,
};
const SUCCESS_MESSAGES: Partial<Record<DeliveryStatus, string>> = {
  scanned: 'COLIS SCANNÉ — EN ROUTE',
  drop_off_pending: 'ARRIVÉ AU CASIER',
  completed: 'DÉPÔT CONFIRMÉ',
};

export function CourierHome() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [screen, setScreen] = useState<CourierScreen>({ name: 'list' });
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [summary, setSummary] = useState<CourierHistorySummary>(EMPTY_SUMMARY);
  const [delivery, setDelivery] = useState<CourierDelivery | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFailed, setShowFailed] = useState(true);
  const [scanReference, setScanReference] = useState('');

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDeliveries();
    if (!silent) setLoading(false);
    setRefreshing(false);

    if (!result.success) {
      setError(result.error);
      setDeliveries([]);
      return;
    }

    setDeliveries(result.data.deliveries);
    setSummary(result.data.summary ?? EMPTY_SUMMARY);
  }, []);

  const loadDelivery = useCallback(async (deliveryId: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDelivery(deliveryId);
    if (!silent) setLoading(false);

    if (!result.success) {
      setError(result.error);
      setDelivery(null);
      return;
    }

    setDelivery(result.data.delivery);
    setScanReference('');
    if (result.data.delivery.hasDropOffPhoto && result.data.delivery.status === 'completed') {
      const proof = await fetchCourierDropOffProof(deliveryId);
      setProofPreview(proof.success ? proof.data.photo : null);
    } else {
      setProofPreview(null);
    }
  }, []);

  useEffect(() => {
    if (screen.name === 'list' || screen.name === 'history') {
      void loadList();
    } else if (screen.name === 'detail' || screen.name === 'report') {
      void loadDelivery(screen.deliveryId);
    }
  }, [screen, loadList, loadDelivery]);

  useEffect(() => {
    void getCurrentCoordinates().then(setOrigin);
  }, []);

  function goBack() {
    if (screen.name === 'scan' || screen.name === 'proof' || screen.name === 'report') {
      setScreen({ name: 'detail', deliveryId: screen.deliveryId });
      return;
    }
    setScreen({ name: 'list' });
  }

  function showSuccessForStatus(next: CourierDelivery) {
    if (next.kind === 'return') {
      if (next.status === 'scanned') {
        setSuccessMessage('COLIS SCANNÉ — RETOUR');
        return;
      }
      if (next.status === 'drop_off_pending') {
        setSuccessMessage('ARRIVÉ CHEZ LE MARCHAND');
        return;
      }
      if (next.status === 'completed') {
        setSuccessMessage('RETOUR CONFIRMÉ');
        return;
      }
    }
    const message = SUCCESS_MESSAGES[next.status];
    if (message) setSuccessMessage(message);
  }

  async function reconcileAfterMutation(
    deliveryId: string,
    previousStatus: CourierDelivery['status'],
  ): Promise<CourierDelivery | null> {
    const refreshed = await fetchCourierDelivery(deliveryId);
    if (!refreshed.success) return null;
    if (refreshed.data.delivery.status === previousStatus) return null;
    return refreshed.data.delivery;
  }

  async function handleScan() {
    if (screen.name !== 'scan' || !scanReference.trim()) return;

    const previousStatus = delivery?.status ?? 'assigned';
    setActing(true);
    setError(null);
    const result = await scanCourierDelivery(screen.deliveryId, scanReference.trim());

    if (!result.success) {
      const reconciled = await reconcileAfterMutation(screen.deliveryId, previousStatus);
      setActing(false);
      if (reconciled) {
        setDelivery(reconciled);
        showSuccessForStatus(reconciled);
        setScreen({ name: 'detail', deliveryId: screen.deliveryId });
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    showSuccessForStatus(result.data.delivery);
    setScreen({ name: 'detail', deliveryId: screen.deliveryId });
  }

  async function handleStartDropOff() {
    if (!delivery) return;

    const previousStatus = delivery.status;
    setActing(true);
    setError(null);
    const result = await startCourierDropOff(delivery.id);

    if (!result.success) {
      const reconciled = await reconcileAfterMutation(delivery.id, previousStatus);
      setActing(false);
      if (reconciled) {
        setDelivery(reconciled);
        showSuccessForStatus(reconciled);
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    showSuccessForStatus(result.data.delivery);
  }

  async function handleCompleteDropOff() {
    if (!delivery || !proofPhoto) return;

    const previousStatus = delivery.status;
    setActing(true);
    setError(null);
    const result = await completeCourierDropOff(delivery.id, {
      compartmentId: delivery.parcel.compartmentId ?? undefined,
      photoBase64: proofPhoto,
    });

    if (!result.success) {
      const reconciled = await reconcileAfterMutation(delivery.id, previousStatus);
      setActing(false);
      if (reconciled) {
        setDelivery(reconciled);
        setProofPhoto(null);
        showSuccessForStatus(reconciled);
        setScreen({ name: 'detail', deliveryId: delivery.id });
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    setProofPhoto(null);
    showSuccessForStatus(result.data.delivery);
    setScreen({ name: 'detail', deliveryId: delivery.id });
  }

  const activeDeliveries = sortDeliveriesByRoute(
    deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status)),
    origin,
  );
  const completedDeliveries = deliveries.filter((d) => d.status === 'completed');
  const failedDeliveries = deliveries.filter((d) => d.status === 'failed');
  const routeStops = buildRouteStops(activeDeliveries, origin);

  useHideTabBar(screen.name !== 'list');

  if (screen.name === 'list') {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISONS" />

        {loading && !refreshing ? (
          <AppSpinner />
        ) : null}

        {!loading && error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label="RÉESSAYER" onPress={() => void loadList()} />
          </View>
        ) : null}

        {!loading && !error ? (
          <ScrollView
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
            {activeDeliveries.length === 0 && completedDeliveries.length === 0 && failedDeliveries.length === 0 ? (
              <EmptyState
                title="AUCUNE LIVRAISON"
                message="Les colis assignés par l'administration apparaîtront ici."
              />
            ) : null}

            <Pressable onPress={() => setScreen({ name: 'history' })} style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>BILAN {summary.days} JOURS</Text>
              <Text style={styles.summaryText}>
                {summary.completed} terminée{summary.completed === 1 ? '' : 's'} · {summary.failed} incident
                {summary.failed === 1 ? '' : 's'} · {summary.successRate}% succès
              </Text>
            </Pressable>

            <DispatcherContactButton />

            {routeStops.length > 0 ? (
              <View style={styles.routeCard}>
                <Text style={styles.sectionTitle}>ITINÉRAIRE SUGGÉRÉ</Text>
                {routeStops.map((stop, index) => (
                  <View key={stop.id} style={styles.routeStop}>
                    <Text style={styles.routeIndex}>{index + 1}</Text>
                    <View style={styles.routeStopText}>
                      <Text style={styles.detailText}>{stop.name}</Text>
                      <Text style={styles.detailSubtext}>
                        {stop.parcelCount} colis{stop.address ? ` · ${stop.address}` : ''}
                      </Text>
                    </View>
                    {stop.latitude != null && stop.longitude != null ? (
                      <Pressable
                        onPress={() => openDirections(stop.latitude!, stop.longitude!, stop.name)}
                        style={styles.routeMaps}
                      >
                        <Text style={styles.routeMapsText}>MAPS</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {activeDeliveries.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>EN COURS ({activeDeliveries.length})</Text>
                {activeDeliveries.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                    style={styles.cardWrap}
                  >
                    <DeliveryCard delivery={item} />
                  </Pressable>
                ))}
              </>
            ) : null}

            {failedDeliveries.length > 0 ? (
              <>
                <Pressable
                  onPress={() => setShowFailed((value) => !value)}
                  style={styles.completedToggle}
                >
                  <Text style={styles.sectionTitle}>
                    INCIDENTS ({failedDeliveries.length}) {showFailed ? '▲' : '▼'}
                  </Text>
                </Pressable>
                {showFailed
                  ? failedDeliveries.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                        style={styles.cardWrap}
                      >
                        <DeliveryCard delivery={item} highlight={false} />
                      </Pressable>
                    ))
                  : null}
              </>
            ) : null}

            {completedDeliveries.length > 0 ? (
              <>
                <Pressable
                  onPress={() => setShowCompleted((value) => !value)}
                  style={styles.completedToggle}
                >
                  <Text style={styles.sectionTitle}>
                    TERMINÉES ({completedDeliveries.length}) {showCompleted ? '▲' : '▼'}
                  </Text>
                </Pressable>
                {showCompleted
                  ? completedDeliveries.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                        style={styles.cardWrap}
                      >
                        <DeliveryCard delivery={item} highlight={false} />
                      </Pressable>
                    ))
                  : null}
              </>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  if (screen.name === 'scan') {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="SCANNER" onBack={goBack} />

        <View style={styles.scanCard}>
          <BarcodeScannerCard onScan={setScanReference} />
          <Text style={styles.scanHint}>
            Scannez le colis ou saisissez la référence pour confirmer la prise en charge.
          </Text>
          <TextInput
            style={styles.scanInput}
            value={scanReference}
            onChangeText={setScanReference}
            placeholder="Référence colis"
            placeholderTextColor={colors.border}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="CONFIRMER LE SCAN"
            onPress={() => void handleScan()}
            disabled={!scanReference.trim()}
            loading={acting}
          />
        </View>
      </View>
    );
  }

  if (screen.name === 'proof') {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="PREUVE DE DÉPÔT" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.proofContent}>
          <Text style={styles.scanHint}>
            Photographiez le colis dans le compartiment avant de confirmer le dépôt.
          </Text>
          <DropOffProofCard
            photoBase64={proofPhoto}
            onCapture={setProofPhoto}
            onRetake={() => setProofPhoto(null)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={
              delivery?.parcel.compartmentLabel
                ? `CONFIRMER LE DÉPÔT · ${delivery.parcel.compartmentLabel}`
                : 'CONFIRMER LE DÉPÔT'
            }
            onPress={() => void handleCompleteDropOff()}
            disabled={!proofPhoto}
            loading={acting}
          />
          <DispatcherContactButton
            context={{
              trackingNumber: delivery?.parcel.trackingNumber ?? delivery?.parcel.reference,
              lockerName: delivery?.parcel.locker?.name,
              statusLabel: delivery?.statusLabel,
            }}
          />
        </ScrollView>
      </View>
    );
  }

  if (screen.name === 'history') {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="HISTORIQUE 90 J" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>PERFORMANCE</Text>
            <Text style={styles.summaryText}>
              {summary.completed} terminée{summary.completed === 1 ? '' : 's'} · {summary.failed}{' '}
              incident{summary.failed === 1 ? '' : 's'} · {summary.successRate}% succès
            </Text>
          </View>
          {completedDeliveries.length === 0 && failedDeliveries.length === 0 ? (
            <EmptyState
              title="AUCUN HISTORIQUE"
              message="Les dépôts des 90 derniers jours apparaîtront ici."
            />
          ) : null}
          {failedDeliveries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
              style={styles.cardWrap}
            >
              <DeliveryCard delivery={item} highlight={false} />
            </Pressable>
          ))}
          {completedDeliveries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
              style={styles.cardWrap}
            >
              <DeliveryCard delivery={item} highlight={false} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (screen.name === 'report') {
    if (!delivery || delivery.id !== screen.deliveryId) {
      if (!loading) void loadDelivery(screen.deliveryId);
      return (
        <View style={styles.container}>
          <ScreenHeader mode="COURSIER" title="SIGNALER UN INCIDENT" onBack={goBack} />
          <AppSpinner />
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
        <ScreenHeader mode="COURSIER" title="SIGNALER UN INCIDENT" onBack={goBack} />
        <ReportIssueForm
          allowedTypes={['failed_delivery', 'locker_unavailable', 'parcel_problem']}
          parcelId={delivery.parcel.id}
          lockerId={delivery.parcel.locker?.id}
          onSubmit={async (input) => {
            const result = await reportCourierIssue({
              ...input,
              parcelId: delivery.parcel.id,
              lockerId: delivery.parcel.locker?.id,
            });
            return result.success ? null : result.error;
          }}
          onSuccess={() => {
            setIssueSuccess('Incident signalé — l\'équipe opérations a été notifiée.');
            setScreen({ name: 'detail', deliveryId: delivery.id });
          }}
          onCancel={goBack}
        />
        <DispatcherContactButton
          context={{
            trackingNumber: delivery.parcel.trackingNumber ?? delivery.parcel.reference,
            lockerName: delivery.parcel.locker?.name,
            statusLabel: delivery.statusLabel,
          }}
        />
      </ScrollView>
    );
  }

  if (loading && !delivery) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISON" onBack={goBack} />
        <AppSpinner />
      </View>
    );
  }

  if (error && !delivery) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISON" onBack={goBack} />
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISON" onBack={goBack} />
        <Text style={styles.error}>Livraison introuvable</Text>
      </View>
    );
  }

  const showScan = delivery.status === 'assigned';
  const isReturn = delivery.kind === 'return';
  const lockerBlocked = Boolean(
    !isReturn && delivery.parcel.locker && !delivery.parcel.locker.canAcceptDropOff,
  );
  const showDropOff = delivery.status === 'scanned' && !lockerBlocked;
  const showComplete = delivery.status === 'drop_off_pending' && !lockerBlocked;
  const hasAction = showScan || showDropOff || showComplete;

  return (
    <View style={styles.detailContainer}>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={[
          styles.detailContent,
          hasAction && styles.detailContentWithAction,
        ]}
      >
        <ScreenHeader mode="COURSIER" title="LIVRAISON" onBack={goBack} />

        {successMessage ? (
          <SuccessBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />
        ) : null}

        {issueSuccess ? (
          <SuccessBanner message={issueSuccess} onDismiss={() => setIssueSuccess(null)} />
        ) : null}

        <DeliveryStepIndicator status={delivery.status} />

        <View style={styles.detailHeader}>
          <Text style={styles.detailReference}>{delivery.parcel.trackingNumber ?? delivery.parcel.reference}</Text>
          <DeliveryStatusBadge status={delivery.status} />
        </View>
        {isReturn ? <Text style={styles.detailMeta}>RETOUR VERS LE MARCHAND</Text> : null}

        <Text style={styles.detailMeta}>{delivery.parcel.businessName}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>DESTINATAIRE</Text>
          <Text style={styles.detailText}>{delivery.parcel.recipientName ?? '—'}</Text>
        </View>

        {delivery.parcel.locker ? (
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>
              {isReturn ? 'POINT D’ENLÈVEMENT' : 'CASIER DE DESTINATION'}
            </Text>
            <Text style={styles.detailText}>{delivery.parcel.locker.name}</Text>
            <Text style={styles.detailSubtext}>{delivery.parcel.locker.address}</Text>
            {delivery.parcel.compartmentLabel ? (
              <Text style={styles.detailSubtext}>
                Compartiment {delivery.parcel.compartmentLabel}
              </Text>
            ) : null}
            {delivery.parcel.locker.statusLabel ? (
              <Text style={styles.detailSubtext}>
                Statut casier : {delivery.parcel.locker.statusLabel}
              </Text>
            ) : null}
            {delivery.parcel.locker.latitude != null &&
            delivery.parcel.locker.longitude != null ? (
              <>
                <View style={{ marginTop: 12 }}>
                  <LockerMapView
                    lockers={[
                      {
                        id: delivery.parcel.locker.id,
                        name: delivery.parcel.locker.name,
                        address: delivery.parcel.locker.address,
                        latitude: delivery.parcel.locker.latitude,
                        longitude: delivery.parcel.locker.longitude,
                        availableCompartments: 0,
                      },
                    ]}
                    highlightLockerId={delivery.parcel.locker.id}
                    height={200}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    openDirections(
                      delivery.parcel.locker!.latitude!,
                      delivery.parcel.locker!.longitude!,
                      delivery.parcel.locker!.name,
                    )
                  }
                  style={styles.directionsButton}
                >
                  <Text style={styles.directionsButtonText}>OUVRIR DANS MAPS</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {lockerBlocked ? (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedText}>
              Casier {delivery.parcel.locker?.statusLabel?.toLowerCase() ?? 'indisponible'} — dépôt
              impossible. Signalez l’incident pour notifier les opérations.
            </Text>
          </View>
        ) : null}

        {delivery.status === 'completed' ? (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>
              {isReturn ? 'RETOUR TERMINÉ' : 'LIVRAISON TERMINÉE'}
            </Text>
          </View>
        ) : null}

        {delivery.status === 'completed' && proofPreview ? (
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>PREUVE DE DÉPÔT</Text>
            <Image source={{ uri: proofPreview }} style={styles.proofImage} />
          </View>
        ) : null}

        <DispatcherContactButton
          context={{
            trackingNumber: delivery.parcel.trackingNumber ?? delivery.parcel.reference,
            lockerName: delivery.parcel.locker?.name,
            statusLabel: delivery.statusLabel,
          }}
        />

        <Pressable
          onPress={() => setScreen({ name: 'report', deliveryId: delivery.id })}
          style={styles.reportButton}
        >
          <Text style={styles.reportButtonText}>SIGNALER UN INCIDENT</Text>
        </Pressable>
      </ScrollView>

      {hasAction ? (
        <View style={styles.actionBar}>
          {showScan ? (
            <PrimaryButton
              label="SCANNER LE COLIS"
              onPress={() => setScreen({ name: 'scan', deliveryId: delivery.id })}
            />
          ) : null}
          {showDropOff ? (
            <PrimaryButton
              label={isReturn ? 'ARRIVÉ CHEZ LE MARCHAND' : 'ARRIVÉ AU CASIER'}
              onPress={() => void handleStartDropOff()}
              loading={acting}
            />
          ) : null}
          {showComplete ? (
            <PrimaryButton
              label={
                isReturn
                  ? 'PHOTOGRAPHIER LA REMISE'
                  : delivery.parcel.compartmentLabel
                    ? `PHOTOGRAPHIER LE DÉPÔT · ${delivery.parcel.compartmentLabel}`
                    : 'PHOTOGRAPHIER LE DÉPÔT'
              }
              onPress={() => {
                setProofPhoto(null);
                setScreen({ name: 'proof', deliveryId: delivery.id });
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type RouteStop = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  parcelCount: number;
};

function sortDeliveriesByRoute(
  items: CourierDelivery[],
  origin: { latitude: number; longitude: number } | null,
): CourierDelivery[] {
  if (!origin) return items;
  const rank = new Map(
    orderLockerStops(
      origin,
      items.flatMap((item) =>
        item.parcel.locker
          ? [
              {
                id: item.parcel.locker.id,
                latitude: item.parcel.locker.latitude,
                longitude: item.parcel.locker.longitude,
              },
            ]
          : [],
      ),
    ).map((stop, index) => [stop.id, index]),
  );

  return [...items].sort((a, b) => {
    const aRank = a.parcel.locker ? (rank.get(a.parcel.locker.id) ?? 999) : 999;
    const bRank = b.parcel.locker ? (rank.get(b.parcel.locker.id) ?? 999) : 999;
    return aRank - bRank;
  });
}

function buildRouteStops(
  items: CourierDelivery[],
  origin: { latitude: number; longitude: number } | null,
): RouteStop[] {
  const byLocker = new Map<string, RouteStop>();
  for (const item of items) {
    const locker = item.parcel.locker;
    if (!locker) continue;
    const existing = byLocker.get(locker.id);
    if (existing) {
      existing.parcelCount += 1;
      continue;
    }
    byLocker.set(locker.id, {
      id: locker.id,
      name: locker.name,
      address: locker.address,
      latitude: locker.latitude,
      longitude: locker.longitude,
      parcelCount: 1,
    });
  }

  const stops = [...byLocker.values()];
  if (!origin) return stops;
  const ordered = orderLockerStops(origin, stops);
  return ordered;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  detailContent: {
    paddingBottom: 24,
  },
  detailContentWithAction: {
    paddingBottom: 100,
  },
  loader: {
    marginTop: 24,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  cardWrap: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.secondary,
    marginTop: 4,
    marginBottom: 4,
  },
  completedToggle: {
    marginTop: 8,
  },
  feedback: {
    gap: 12,
  },
  error: {
    color: colors.danger,
    fontWeight: '500',
    marginBottom: 12,
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
  },
  detailMeta: {
    fontWeight: '500',
    marginBottom: 24,
    color: colors.secondary,
  },
  detailSection: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    color: colors.secondary,
  },
  detailText: {
    fontWeight: '600',
    color: colors.secondary,
  },
  detailSubtext: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
  },
  scanCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 24,
    gap: 16,
  },
  scanHint: {
    fontWeight: '500',
    color: colors.secondary,
    fontSize: 13,
  },
  scanInput: {
    height: spacing.buttonHeight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 16,
    fontWeight: '600',
    fontSize: 18,
    color: colors.secondary,
    letterSpacing: 1,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedBanner: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
  },
  completedText: {
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  reportButton: {
    marginTop: 16,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  reportButtonText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  directionsButton: {
    marginTop: 12,
    borderWidth: borders.width,
    borderColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  directionsButtonText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.primary,
  },
  blockedBanner: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.danger,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 16,
  },
  blockedText: {
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 20,
    color: colors.danger,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 8,
  },
  summaryText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    textAlign: 'center',
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 24,
  },
  routeStopText: {
    flex: 1,
  },
  routeMaps: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: borders.width,
    borderColor: colors.primary,
    borderRadius: radius.button,
  },
  routeMapsText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
  },
  proofContent: {
    gap: 16,
    paddingBottom: 32,
  },
  proofImage: {
    height: 200,
    borderRadius: radius.card,
    marginTop: 8,
    backgroundColor: colors.secondary,
  },
  });
}
