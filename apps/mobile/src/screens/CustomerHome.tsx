import { colors, radius, spacing } from '@eveider/config-ui';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ParcelJourneyHero } from '../components/ParcelJourneyHero';
import { LockerIllustration } from '../components/LockerIllustration';
import { ParcelCard } from '../components/ParcelCard';
import { ParcelTimeline } from '../components/ParcelTimeline';
import { ParcelStatusBadge } from '../components/ParcelStatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportIssueForm } from '../components/ReportIssueForm';
import { SuccessBanner } from '../components/SuccessBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { useHideTabBar } from '../navigation/useHideTabBar';
import { fetchCustomerParcel, fetchCustomerParcels, fetchCustomerLockers, assignCustomerParcelLocker, reportCustomerIssue, type CustomerLocker, type CustomerParcel } from '../lib/api';
import { LockerMapView, LockerSelectPanel, getCurrentCoordinates } from '../components/LockerMapView';
import { pickFeaturedParcel } from '../lib/parcel-journey';

type CustomerScreen =
  | { name: 'list' }
  | { name: 'detail'; parcelId: string }
  | { name: 'pickup'; parcelId: string }
  | { name: 'report'; parcelId: string }
  | { name: 'select-locker'; parcelId: string };

type CustomerHomeProps = {
  initialParcelId?: string;
};

export function CustomerHome({ initialParcelId }: CustomerHomeProps) {
  const [screen, setScreen] = useState<CustomerScreen>(
    initialParcelId ? { name: 'detail', parcelId: initialParcelId } : { name: 'list' },
  );
  const [parcels, setParcels] = useState<CustomerParcel[]>([]);
  const [parcel, setParcel] = useState<CustomerParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [lockers, setLockers] = useState<CustomerLocker[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [lockersLoading, setLockersLoading] = useState(false);
  const [assigningLocker, setAssigningLocker] = useState(false);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCustomerParcels();
    if (!silent) setLoading(false);
    setRefreshing(false);

    if (!result.success) {
      setError(result.error);
      setParcels([]);
      return;
    }

    setParcels(result.data.parcels);
  }, []);

  const loadParcel = useCallback(async (parcelId: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCustomerParcel(parcelId);
    if (!silent) setLoading(false);

    if (!result.success) {
      setError(result.error);
      setParcel(null);
      return;
    }

    setParcel(result.data.parcel);
  }, []);

  const loadNearestLockers = useCallback(async () => {
    setLockersLoading(true);
    setSelectedLockerId('');
    const coords = await getCurrentCoordinates();
    const result = await fetchCustomerLockers(coords.latitude, coords.longitude);
    setLockersLoading(false);

    if (result.success) {
      setLockers(result.data.lockers);
      if (result.data.lockers.length > 0) {
        setSelectedLockerId(result.data.lockers[0]!.id);
      }
    }
  }, []);

  useEffect(() => {
    if (screen.name === 'list') {
      void loadList();
    } else if (screen.name === 'detail' || screen.name === 'report') {
      void loadParcel(screen.parcelId);
    } else if (screen.name === 'select-locker') {
      void loadParcel(screen.parcelId);
      void loadNearestLockers();
    }
  }, [screen, loadList, loadParcel, loadNearestLockers]);

  function goBack() {
    if (screen.name === 'pickup') {
      setScreen({ name: 'detail', parcelId: screen.parcelId });
      return;
    }
    if (screen.name === 'report') {
      setScreen({ name: 'detail', parcelId: screen.parcelId });
      return;
    }
    if (screen.name === 'select-locker') {
      setScreen({ name: 'detail', parcelId: screen.parcelId });
      return;
    }
    setScreen({ name: 'list' });
  }

  const featuredParcel = pickFeaturedParcel(parcels);
  const otherParcels = featuredParcel
    ? parcels.filter((p) => p.id !== featuredParcel.id)
    : parcels;

  useHideTabBar(screen.name !== 'list');

  async function handleAssignLocker() {
    if (screen.name !== 'select-locker' || !selectedLockerId) return;

    setAssigningLocker(true);
    setError(null);
    const result = await assignCustomerParcelLocker(screen.parcelId, selectedLockerId);
    setAssigningLocker(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setParcel(result.data.parcel);
    setScreen({ name: 'detail', parcelId: screen.parcelId });
  }

  if (screen.name === 'select-locker') {
    if (!parcel || parcel.id !== screen.parcelId) {
      if (!loading) void loadParcel(screen.parcelId);
      return (
        <View style={styles.container}>
          <ScreenHeader mode="CLIENT" title="CHOISIR UN CASIER" onBack={goBack} />
          <ActivityIndicator color={colors.secondary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader mode="CLIENT" title="CHOISIR UN CASIER" onBack={goBack} />

        <Text style={styles.lockerHint}>
          Sélectionnez le casier le plus proche pour recevoir votre colis {parcel.reference}.
        </Text>

        <LockerMapView
          lockers={lockers}
          selectedLockerId={selectedLockerId}
          onSelectLocker={setSelectedLockerId}
        />

        <LockerSelectPanel
          lockers={lockers}
          selectedLockerId={selectedLockerId}
          onSelectLocker={setSelectedLockerId}
          loading={lockersLoading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label="CONFIRMER CE CASIER"
            onPress={() => void handleAssignLocker()}
            disabled={!selectedLockerId || lockers.length === 0}
            loading={assigningLocker}
          />
        </View>
      </ScrollView>
    );
  }

  if (screen.name === 'list') {
    return (
      <View style={styles.listContainer}>
        <ScreenHeader mode="CLIENT" title="MES COLIS" compact />

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
            style={styles.scroll}
            contentContainerStyle={[
              styles.listContent,
              otherParcels.length === 0 && styles.listContentCentered,
            ]}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
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
            {featuredParcel ? (
              <ParcelJourneyHero
                parcel={featuredParcel}
                onPressDetail={() => setScreen({ name: 'detail', parcelId: featuredParcel.id })}
                onPressPickup={
                  featuredParcel.status === 'ready_for_pickup'
                    ? () => setScreen({ name: 'pickup', parcelId: featuredParcel.id })
                    : undefined
                }
              />
            ) : (
              <View style={styles.emptyState}>
                <LockerIllustration visual="empty" />
                <Text style={styles.emptyTitle}>AUCUN COLIS</Text>
                <Text style={styles.emptyMessage}>
                  Les colis adressés à votre numéro de téléphone apparaîtront ici avec un suivi
                  en direct.
                </Text>
              </View>
            )}

            {otherParcels.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  {otherParcels.length === 1 ? 'AUTRE COLIS' : 'AUTRES COLIS'}
                </Text>
                {otherParcels.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setScreen({ name: 'detail', parcelId: item.id })}
                    style={styles.cardWrap}
                  >
                    <ParcelCard parcel={item} />
                  </Pressable>
                ))}
              </>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  if (screen.name === 'pickup') {
    if (!parcel || parcel.id !== screen.parcelId) {
      if (!loading) void loadParcel(screen.parcelId);
      return (
        <View style={styles.container}>
          <ScreenHeader mode="CLIENT" title="CODE DE RETRAIT" onBack={goBack} />
          <ActivityIndicator color={colors.secondary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <ScreenHeader mode="CLIENT" title="CODE DE RETRAIT" onBack={goBack} />

        <View style={styles.pinCard}>
          <Text style={styles.pinLabel}>SAISIR AU CASIER</Text>
          <Text style={styles.pinCode}>{parcel.pickupPin ?? '———'}</Text>
          {parcel.compartmentLabel ? (
            <Text style={styles.compartmentLabel}>COMPARTIMENT {parcel.compartmentLabel}</Text>
          ) : null}
          <Text style={styles.pinHint}>
            Entrez ce code sur le clavier du casier pour ouvrir le compartiment.
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>CASIER</Text>
          <Text style={styles.detailText}>{parcel.locker?.name ?? '—'}</Text>
          <Text style={styles.detailSubtext}>{parcel.locker?.address ?? ''}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>COLIS</Text>
          <Text style={styles.detailText}>{parcel.reference}</Text>
          <Text style={styles.detailSubtext}>{parcel.businessName}</Text>
        </View>
      </ScrollView>
    );
  }

  if (screen.name === 'report') {
    if (!parcel || parcel.id !== screen.parcelId) {
      if (!loading) void loadParcel(screen.parcelId);
      return (
        <View style={styles.container}>
          <ScreenHeader mode="CLIENT" title="SIGNALER UN PROBLÈME" onBack={goBack} />
          <ActivityIndicator color={colors.secondary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <ScreenHeader mode="CLIENT" title="SIGNALER UN PROBLÈME" onBack={goBack} />
        <ReportIssueForm
          allowedTypes={['parcel_problem', 'locker_unavailable', 'locker_system']}
          parcelId={parcel.id}
          lockerId={parcel.locker?.id}
          onSubmit={async (input) => {
            const result = await reportCustomerIssue({
              ...input,
              parcelId: parcel.id,
              lockerId: parcel.locker?.id,
            });
            return result.success ? null : result.error;
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

  if (loading && !parcel) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="CLIENT" title="DÉTAIL COLIS" onBack={goBack} />
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (error || !parcel) {
    return (
      <View style={styles.container}>
        <ScreenHeader mode="CLIENT" title="DÉTAIL COLIS" onBack={goBack} />
        <Text style={styles.error}>{error ?? 'Colis introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <ScreenHeader mode="CLIENT" title="DÉTAIL COLIS" onBack={goBack} />

      {issueSuccess ? (
        <SuccessBanner message={issueSuccess} onDismiss={() => setIssueSuccess(null)} />
      ) : null}

      <View style={styles.detailHeader}>
        <Text style={styles.detailReference}>{parcel.reference}</Text>
        <ParcelStatusBadge status={parcel.status} />
      </View>

      <Text style={styles.detailMeta}>{parcel.businessName}</Text>

      <View style={styles.detailSection}>
        <Text style={styles.sectionLabel}>SUIVI</Text>
        <ParcelTimeline currentStatus={parcel.status} />
      </View>

      {parcel.locker ? (
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>CASIER</Text>
          <Text style={styles.detailText}>{parcel.locker.name}</Text>
          <Text style={styles.detailSubtext}>{parcel.locker.address}</Text>
          {parcel.compartmentLabel ? (
            <Text style={styles.detailSubtext}>Compartiment {parcel.compartmentLabel}</Text>
          ) : null}
        </View>
      ) : parcel.status === 'created' ? (
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>CASIER</Text>
          <Text style={styles.detailSubtext}>
            Choisissez votre casier de retrait pour lancer la livraison.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label="CHOISIR UN CASIER"
              onPress={() => setScreen({ name: 'select-locker', parcelId: parcel.id })}
            />
          </View>
        </View>
      ) : null}

      {parcel.status === 'ready_for_pickup' ? (
        <PrimaryButton
          label="VOIR LE CODE DE RETRAIT"
          onPress={() => setScreen({ name: 'pickup', parcelId: parcel.id })}
        />
      ) : null}

      {parcel.status === 'collected' ? (
        <View style={styles.collectedBanner}>
          <Text style={styles.collectedText}>COLIS RETIRÉ</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => setScreen({ name: 'report', parcelId: parcel.id })}
        style={styles.reportButton}
      >
        <Text style={styles.reportButtonText}>SIGNALER UN PROBLÈME</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 0,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as const)
      : null),
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as const)
      : null),
  },
  detailContent: {
    paddingBottom: 40,
  },
  loader: {
    marginTop: 24,
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as const)
      : null),
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
    gap: 20,
  },
  listContentCentered: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 14,
    color: colors.secondary,
  },
  emptyMessage: {
    fontWeight: '500',
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 20,
    maxWidth: 280,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.secondary,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  cardWrap: {
    marginBottom: 12,
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
  pinCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.card,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.secondary,
  },
  pinCode: {
    marginTop: 16,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 10,
    color: colors.secondary,
  },
  compartmentLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  pinHint: {
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 13,
    color: colors.secondary,
  },
  collectedBanner: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  collectedText: {
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
  lockerHint: {
    marginBottom: 12,
    fontWeight: '500',
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 20,
  },
});
