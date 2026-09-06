import { borders, spacing, type ColorTokens } from '@eveider/config-ui';
import { orderLockerStops, type DeliveryStatus } from '@eveider/domain';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ImageBackground,
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
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { DeliveryStepIndicator } from '../components/DeliveryStepIndicator';
import { DispatcherContactButton } from '../components/DispatcherContactButton';
import { DropOffProofCard } from '../components/DropOffProofCard';
import { EmptyState } from '../components/EmptyState';
import { LockerMapView, getCurrentCoordinates, openDirections } from '../components/LockerMapView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { ScreenHeader } from '../components/ScreenHeader';
import { SuccessBanner } from '../components/SuccessBanner';
import { useHideTabBar } from '../navigation/useHideTabBar';
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
import { openDispatcherWhatsApp } from '../lib/support';
import { useColors } from '../theme';

const HOME_HERO = require('../assets/delivery.jpeg');

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
  const { t } = useTranslation();
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

  useHideTabBar(screen.name !== 'list');

  if (screen.name === 'list') {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title={t('tabs.home')} />
        {loading && !refreshing ? <AppSpinner /> : null}
        {!loading && error ? (
          <View style={styles.body}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void loadList()} />
          </View>
        ) : null}
        {!loading && !error ? (
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadList(true);
                }}
                tintColor={colors.secondary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            }
          >
            <ImageBackground source={HOME_HERO} style={styles.hero} imageStyle={styles.heroImage}>
              <View style={styles.heroScrim} />
              <Text style={styles.hello}>
                {t('courier.greeting')}{' '}
                <Text style={styles.helloName}>{t('roles.courier')}</Text>
              </Text>
              <View style={styles.heroBox}>
                <Text style={styles.heroTitle}>{t('courier.heroTitle')}</Text>
                <Text style={styles.heroStat}>
                  {activeDeliveries.length === 0
                    ? t('courier.heroIdle')
                    : t('courier.heroActive', { count: activeDeliveries.length })}
                </Text>
                <Text style={styles.heroSub}>
                  {t('courier.summaryText', {
                    completed: summary.completed,
                    failed: summary.failed,
                    rate: summary.successRate,
                  })}
                </Text>
              </View>
            </ImageBackground>

            <View style={styles.body}>
              <ActionRow
                icon="message-circle"
                label={t('courier.contactDispatch')}
                onPress={() => openDispatcherWhatsApp()}
              />
              <ActionRow
                icon="clock"
                label={t('courier.viewHistory')}
                onPress={() => setScreen({ name: 'history' })}
                last
              />

              {activeDeliveries.length === 0 &&
              completedDeliveries.length === 0 &&
              failedDeliveries.length === 0 ? (
                <EmptyState title={t('courier.emptyTitle')} message={t('courier.emptyMessage')} />
              ) : null}

              {activeDeliveries.length > 0 ? (
                <>
                  <Text style={styles.section}>
                    {t('courier.activeTitle')} ({activeDeliveries.length})
                  </Text>
                  {activeDeliveries.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                      style={styles.rowWrap}
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
                    style={styles.sectionToggle}
                  >
                    <Text style={styles.section}>
                      {t('courier.incidentsTitle')} ({failedDeliveries.length}){' '}
                      {showFailed ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  {showFailed
                    ? failedDeliveries.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                          style={styles.rowWrap}
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
                    style={styles.sectionToggle}
                  >
                    <Text style={styles.section}>
                      {t('courier.completedTitle')} ({completedDeliveries.length}){' '}
                      {showCompleted ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  {showCompleted
                    ? completedDeliveries.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
                          style={styles.rowWrap}
                        >
                          <DeliveryCard delivery={item} highlight={false} />
                        </Pressable>
                      ))
                    : null}
                </>
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </View>
    );
  }

  if (screen.name === 'scan') {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title="Scanner" onBack={goBack} />
        <View style={styles.panel}>
          <BarcodeScannerCard onScan={setScanReference} />
          <Text style={styles.hint}>
            Scannez le colis ou saisissez la référence pour confirmer la prise en charge.
          </Text>
          <TextInput
            style={styles.scanInput}
            value={scanReference}
            onChangeText={setScanReference}
            placeholder="Référence colis"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Confirmer le scan"
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
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title="Preuve de dépôt" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.panelScroll}>
          <Text style={styles.hint}>
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
                ? `Confirmer le dépôt · ${delivery.parcel.compartmentLabel}`
                : 'Confirmer le dépôt'
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
            last
          />
        </ScrollView>
      </View>
    );
  }

  if (screen.name === 'history') {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title={t('courier.viewHistory')} onBack={goBack} />
        <ScrollView contentContainerStyle={styles.panelScroll}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {t('courier.summaryLabel', { days: summary.days })}
            </Text>
            <Text style={styles.summaryText}>
              {t('courier.summaryText', {
                completed: summary.completed,
                failed: summary.failed,
                rate: summary.successRate,
              })}
            </Text>
          </View>
          {completedDeliveries.length === 0 && failedDeliveries.length === 0 ? (
            <EmptyState
              title={t('courier.emptyTitle')}
              message="Les dépôts des 90 derniers jours apparaîtront ici."
            />
          ) : null}
          {failedDeliveries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
              style={styles.rowWrap}
            >
              <DeliveryCard delivery={item} highlight={false} />
            </Pressable>
          ))}
          {completedDeliveries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setScreen({ name: 'detail', deliveryId: item.id })}
              style={styles.rowWrap}
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
        <View style={styles.screen}>
          <ScreenHeader mode="COURSIER" title={t('courier.reportIssue')} onBack={goBack} />
          <AppSpinner />
        </View>
      );
    }

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.panelScroll}>
        <ScreenHeader mode="COURSIER" title={t('courier.reportIssue')} onBack={goBack} />
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
            setIssueSuccess("Incident signalé — l'équipe opérations a été notifiée.");
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
          last
        />
      </ScrollView>
    );
  }

  if (loading && !delivery) {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title={t('tabs.deliveries')} onBack={goBack} />
        <AppSpinner />
      </View>
    );
  }

  if (error && !delivery) {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title={t('tabs.deliveries')} onBack={goBack} />
        <Text style={[styles.error, styles.body]}>{error}</Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.screen}>
        <ScreenHeader mode="COURSIER" title={t('tabs.deliveries')} onBack={goBack} />
        <Text style={[styles.error, styles.body]}>Livraison introuvable</Text>
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
        <ScreenHeader mode="COURSIER" title={t('tabs.deliveries')} onBack={goBack} />

        {successMessage ? (
          <SuccessBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />
        ) : null}

        {issueSuccess ? (
          <SuccessBanner message={issueSuccess} onDismiss={() => setIssueSuccess(null)} />
        ) : null}

        <View style={styles.detailBody}>
          <DeliveryStepIndicator status={delivery.status} />

          <View style={styles.detailHeader}>
            <Text style={styles.detailReference}>
              {delivery.parcel.trackingNumber ?? delivery.parcel.reference}
            </Text>
            <DeliveryStatusBadge status={delivery.status} />
          </View>
          {isReturn ? <Text style={styles.detailMeta}>Retour vers le marchand</Text> : null}
          <Text style={styles.detailMeta}>{delivery.parcel.businessName}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>Destinataire</Text>
            <Text style={styles.detailText}>{delivery.parcel.recipientName ?? '—'}</Text>
          </View>

          {delivery.parcel.locker ? (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>
                {isReturn ? "Point d'enlèvement" : 'Casier de destination'}
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
                  <View style={styles.mapWrap}>
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
                  <ActionRow
                    icon="navigation"
                    label={t('courier.openMaps')}
                    onPress={() =>
                      openDirections(
                        delivery.parcel.locker!.latitude!,
                        delivery.parcel.locker!.longitude!,
                        delivery.parcel.locker!.name,
                      )
                    }
                    last
                  />
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
                {isReturn ? 'Retour terminé' : 'Livraison terminée'}
              </Text>
            </View>
          ) : null}

          {delivery.status === 'completed' && proofPreview ? (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>Preuve de dépôt</Text>
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
          <ActionRow
            icon="alert-triangle"
            label={t('courier.reportIssue')}
            onPress={() => setScreen({ name: 'report', deliveryId: delivery.id })}
            last
          />
        </View>
      </ScrollView>

      {hasAction ? (
        <View style={styles.actionBar}>
          {showScan ? (
            <PrimaryButton
              label="Scanner le colis"
              onPress={() => setScreen({ name: 'scan', deliveryId: delivery.id })}
            />
          ) : null}
          {showDropOff ? (
            <PrimaryButton
              label={isReturn ? 'Arrivé chez le marchand' : 'Arrivé au casier'}
              onPress={() => void handleStartDropOff()}
              loading={acting}
            />
          ) : null}
          {showComplete ? (
            <PrimaryButton
              label={
                isReturn
                  ? 'Photographier la remise'
                  : delivery.parcel.compartmentLabel
                    ? `Photographier le dépôt · ${delivery.parcel.compartmentLabel}`
                    : 'Photographier le dépôt'
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    hero: {
      minHeight: 280,
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
    },
    heroImage: {
      resizeMode: 'cover',
    },
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    hello: {
      fontSize: 28,
      fontWeight: '400',
      color: '#FFFFFF',
      marginBottom: 16,
    },
    helloName: {
      fontWeight: '700',
      color: colors.primary,
    },
    heroBox: {
      backgroundColor: 'rgba(18,18,18,0.72)',
      padding: 14,
      gap: 6,
    },
    heroTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    heroStat: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroSub: {
      fontSize: 13,
      fontWeight: '400',
      color: 'rgba(255,255,255,0.72)',
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    section: {
      marginTop: 24,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    sectionToggle: {
      marginTop: 8,
    },
    rowWrap: {
      marginBottom: 8,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
      marginBottom: 12,
    },
    panel: {
      margin: 20,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 16,
    },
    panelScroll: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      gap: 12,
    },
    hint: {
      fontWeight: '400',
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    scanInput: {
      height: spacing.buttonHeight,
      borderWidth: borders.width,
      borderColor: colors.border,
      paddingHorizontal: 14,
      fontWeight: '600',
      fontSize: 16,
      color: colors.secondary,
      backgroundColor: colors.background,
    },
    summaryCard: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    summaryText: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    detailContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    detailScroll: {
      flex: 1,
    },
    detailContent: {
      paddingBottom: 24,
    },
    detailContentWithAction: {
      paddingBottom: 100,
    },
    detailBody: {
      paddingHorizontal: 20,
      paddingTop: 16,
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
      fontVariant: ['tabular-nums'],
      flex: 1,
    },
    detailMeta: {
      fontWeight: '400',
      marginBottom: 8,
      color: colors.textMuted,
      fontSize: 14,
    },
    detailSection: {
      marginTop: 12,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      padding: 14,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.textMuted,
    },
    detailText: {
      fontWeight: '600',
      fontSize: 15,
      color: colors.secondary,
    },
    detailSubtext: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    mapWrap: {
      marginTop: 12,
      marginBottom: 8,
      borderWidth: borders.width,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    actionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingBottom: 28,
      backgroundColor: colors.background,
      borderTopWidth: borders.width,
      borderTopColor: colors.border,
    },
    completedBanner: {
      backgroundColor: colors.successMuted,
      borderWidth: borders.width,
      borderColor: colors.primary,
      padding: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    completedText: {
      fontWeight: '600',
      color: colors.successFg,
    },
    blockedBanner: {
      backgroundColor: colors.dangerMuted,
      borderWidth: borders.width,
      borderColor: colors.danger,
      padding: 14,
      marginBottom: 12,
    },
    blockedText: {
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 20,
      color: colors.dangerFg,
    },
    proofImage: {
      height: 200,
      marginTop: 8,
      backgroundColor: colors.secondary,
    },
  });
}
