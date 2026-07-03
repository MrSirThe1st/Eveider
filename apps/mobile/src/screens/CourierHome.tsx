import { colors, radius, spacing } from '@eveider/config-ui';
import type { DeliveryStatus } from '@eveider/domain';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { DeliveryStepIndicator } from '../components/DeliveryStepIndicator';
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
  scanCourierDelivery,
  startCourierDropOff,
  reportCourierIssue,
  type CourierDelivery,
} from '../lib/api';
import { LockerMapView, openDirections } from '../components/LockerMapView';

type CourierScreen =
  | { name: 'list' }
  | { name: 'detail'; deliveryId: string }
  | { name: 'scan'; deliveryId: string }
  | { name: 'report'; deliveryId: string };

const ACTIVE_STATUSES: DeliveryStatus[] = ['assigned', 'scanned', 'drop_off_pending'];
const SUCCESS_MESSAGES: Partial<Record<DeliveryStatus, string>> = {
  scanned: 'COLIS SCANNÉ — EN ROUTE',
  drop_off_pending: 'ARRIVÉ AU CASIER',
  completed: 'DÉPÔT CONFIRMÉ',
};

export function CourierHome() {
  const [screen, setScreen] = useState<CourierScreen>({ name: 'list' });
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [delivery, setDelivery] = useState<CourierDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
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
  }, []);

  useEffect(() => {
    if (screen.name === 'list') {
      void loadList();
    } else if (screen.name === 'detail' || screen.name === 'report') {
      void loadDelivery(screen.deliveryId);
    }
  }, [screen, loadList, loadDelivery]);

  function goBack() {
    if (screen.name === 'scan') {
      setScreen({ name: 'detail', deliveryId: screen.deliveryId });
      return;
    }
    if (screen.name === 'report') {
      setScreen({ name: 'detail', deliveryId: screen.deliveryId });
      return;
    }
    setScreen({ name: 'list' });
  }

  function showSuccessForStatus(status: DeliveryStatus) {
    const message = SUCCESS_MESSAGES[status];
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
        showSuccessForStatus(reconciled.status);
        setScreen({ name: 'detail', deliveryId: screen.deliveryId });
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    showSuccessForStatus(result.data.delivery.status);
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
        showSuccessForStatus(reconciled.status);
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    showSuccessForStatus(result.data.delivery.status);
  }

  async function handleCompleteDropOff() {
    if (!delivery) return;

    const previousStatus = delivery.status;
    setActing(true);
    setError(null);
    const result = await completeCourierDropOff(delivery.id);

    if (!result.success) {
      const reconciled = await reconcileAfterMutation(delivery.id, previousStatus);
      setActing(false);
      if (reconciled) {
        setDelivery(reconciled);
        showSuccessForStatus(reconciled.status);
        return;
      }
      setError(result.error);
      return;
    }

    setActing(false);
    setDelivery(result.data.delivery);
    showSuccessForStatus(result.data.delivery.status);
  }

  const activeDeliveries = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const completedDeliveries = deliveries.filter((d) => d.status === 'completed');

  useHideTabBar(screen.name !== 'list');

  if (screen.name === 'list') {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISONS" />

        {loading && !refreshing ? (
          <ActivityIndicator color={colors.secondary} style={styles.loader} />
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
            {activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
              <EmptyState
                title="AUCUNE LIVRAISON"
                message="Les colis assignés par l'administration apparaîtront ici."
              />
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
          <Text style={styles.scanHint}>
            Saisissez la référence du colis pour confirmer la prise en charge.
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

  if (screen.name === 'report') {
    if (!delivery || delivery.id !== screen.deliveryId) {
      if (!loading) void loadDelivery(screen.deliveryId);
      return (
        <View style={styles.container}>
          <ScreenHeader mode="COURSIER" title="SIGNALER UN INCIDENT" onBack={goBack} />
          <ActivityIndicator color={colors.secondary} />
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
      </ScrollView>
    );
  }

  if (loading && !delivery) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="COURSIER" title="LIVRAISON" onBack={goBack} />
        <ActivityIndicator color={colors.secondary} />
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
  const showDropOff = delivery.status === 'scanned';
  const showComplete = delivery.status === 'drop_off_pending';
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
          <Text style={styles.detailReference}>{delivery.parcel.reference}</Text>
          <DeliveryStatusBadge status={delivery.status} />
        </View>

        <Text style={styles.detailMeta}>{delivery.parcel.businessName}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>DESTINATAIRE</Text>
          <Text style={styles.detailText}>{delivery.parcel.recipientName ?? '—'}</Text>
        </View>

        {delivery.parcel.locker ? (
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>CASIER DE DESTINATION</Text>
            <Text style={styles.detailText}>{delivery.parcel.locker.name}</Text>
            <Text style={styles.detailSubtext}>{delivery.parcel.locker.address}</Text>
            {delivery.parcel.compartmentLabel ? (
              <Text style={styles.detailSubtext}>
                Compartiment {delivery.parcel.compartmentLabel}
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

        {delivery.status === 'completed' ? (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>LIVRAISON TERMINÉE</Text>
          </View>
        ) : null}

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
              label="ARRIVÉ AU CASIER"
              onPress={() => void handleStartDropOff()}
              loading={acting}
            />
          ) : null}
          {showComplete ? (
            <PrimaryButton
              label="CONFIRMER LE DÉPÔT"
              onPress={() => void handleCompleteDropOff()}
              loading={acting}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: colors.background,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
});
