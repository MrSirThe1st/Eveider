import { borders, type ColorTokens } from '@eveider/config-ui';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DeliveryCard } from '../components/DeliveryCard';
import { DriverEmptyState } from '../components/DriverEmptyState';
import { DriverSecondaryAction } from '../components/DriverSecondaryAction';
import { DriverSummaryCard } from '../components/DriverSummaryCard';
import { LocationBlock } from '../components/LocationBlock';
import { OperationalTimeline } from '../components/OperationalTimeline';
import { PrimaryButton } from '../components/PrimaryButton';
import { RouteStopRow } from '../components/RouteStopRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionLabel } from '../components/SectionLabel';
import { useSettings } from '../context/settings-context';
import {
  DRIVER_VISUAL_QA_ACTIVE,
  DRIVER_VISUAL_QA_HISTORY,
} from '../lib/driver-visual-qa-fixtures';
import {
  buildDriverRouteLegs,
  getDriverCurrentStop,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverOrigin,
  getDriverPackageSizeLabel,
  getDriverPrimaryAction,
  getDriverTrackingLabel,
  summarizeDriverRoute,
} from '../lib/driver-presentation';
import { useColors } from '../theme';

type Panel = 'list' | 'detail' | 'route' | 'history' | 'empty';

type DriverVisualQaScreenProps = {
  onExit?: () => void;
};

/**
 * __DEV__ visual polish harness — ugly real-world data, no API.
 * Open via ?driverQa=1 on Expo web / deep link.
 * Forces light palette so QA matches the Eveider product surface language.
 */
export function DriverVisualQaScreen({ onExit }: DriverVisualQaScreenProps) {
  const { theme, setTheme } = useSettings();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [panel, setPanel] = useState<Panel>(() => {
    try {
      const global = globalThis as { location?: { href?: string } };
      const href = global.location?.href;
      if (!href) return 'list';
      const value = new URL(href).searchParams.get('panel');
      if (value === 'detail' || value === 'route' || value === 'history' || value === 'empty') {
        return value;
      }
    } catch {
      /* ignore */
    }
    return 'list';
  });
  const detail = DRIVER_VISUAL_QA_ACTIVE[0]!;
  const legs = useMemo(() => {
    const raw = buildDriverRouteLegs(DRIVER_VISUAL_QA_ACTIVE);
    const collects = raw.filter((leg) => leg.kind === 'collect');
    const deposits = raw.filter((leg) => leg.kind === 'deposit');
    return [...collects, ...deposits];
  }, []);
  const routeSummary = summarizeDriverRoute(legs);

  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        mode="DRIVER"
        title={`QA · ${panel}`}
        onBack={onExit}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsScroll}
      >
        {(
          [
            ['list', 'Livraisons'],
            ['detail', 'Détail'],
            ['route', 'Itinéraire'],
            ['history', 'Historique'],
            ['empty', 'Vide'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setPanel(id)}
            style={[styles.tab, panel === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, panel === id && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {panel === 'list' ? (
          <View style={styles.gap}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueCount}>
                {DRIVER_VISUAL_QA_ACTIVE.length} livraisons assignées
              </Text>
              <Text style={styles.queueRoute}>Ouvrir l’itinéraire</Text>
            </View>
            {DRIVER_VISUAL_QA_ACTIVE.map((item, index) => (
              <DeliveryCard
                key={item.id}
                delivery={item}
                highlight={index === 0}
                onItinerary={() => undefined}
              />
            ))}
          </View>
        ) : null}

        {panel === 'detail' ? <DetailPreview delivery={detail} styles={styles} /> : null}

        {panel === 'route' ? (
          <View style={styles.gap}>
            <DriverSummaryCard
              variant="route"
              title="Itinéraire"
              subtitle={`${routeSummary.stopCount} arrêts · ${routeSummary.parcelCount} colis`}
            />
            <View style={styles.nextBlock}>
              <Text style={styles.nextKicker}>Prochain arrêt</Text>
              <Text style={styles.nextTitle}>
                {legs[0]?.kindLabel} · {legs[0]?.name}
              </Text>
              <Text style={styles.nextAction}>{legs[0]?.actionLabel}</Text>
              <Text style={styles.nextAddress}>{legs[0]?.address}</Text>
            </View>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                Carte ({legs.filter((l) => l.latitude != null).length} pins) — hauteur prod 240
              </Text>
            </View>
            {legs.map((stop, index) => (
              <RouteStopRow
                key={stop.id}
                index={index + 1}
                kindLabel={stop.kindLabel}
                name={stop.name}
                actionLabel={stop.actionLabel}
                address={stop.address}
                highlight={index === 0}
                onNavigate={() => undefined}
              />
            ))}
            <PrimaryButton label="Démarrer l’itinéraire" onPress={() => undefined} variant="brand" />
            <DriverSecondaryAction label="Contacter le dispatch" onPress={() => undefined} />
          </View>
        ) : null}

        {panel === 'history' ? (
          <View style={styles.gap}>
            <DriverSummaryCard
              variant="history"
              metrics={[
                { value: 12, label: 'Terminées' },
                { value: 2, label: 'Incidents' },
                { value: '86%', label: 'Réussite' },
              ]}
              footer="Bilan 90 jours"
            />
            {DRIVER_VISUAL_QA_HISTORY.map((item) => (
              <DeliveryCard key={item.id} delivery={item} variant="history" />
            ))}
          </View>
        ) : null}

        {panel === 'empty' ? (
          <DriverEmptyState
            title="Aucune livraison assignée"
            message="Vous serez notifié lorsqu’une livraison vous sera assignée."
            actionLabel="Contacter le dispatch"
            onAction={() => undefined}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailPreview({
  delivery,
  styles,
}: {
  delivery: (typeof DRIVER_VISUAL_QA_ACTIVE)[0];
  styles: ReturnType<typeof createStyles>;
}) {
  const step = getDriverDeliveryStep(delivery);
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const current = getDriverCurrentStop(delivery);
  const action = getDriverPrimaryAction(delivery);
  const tracking = getDriverTrackingLabel(delivery);
  const sizeLabel = getDriverPackageSizeLabel(delivery.parcel.packageSize);
  const pickupPhase =
    step.id === 'awaiting_accept' ||
    step.id === 'ready_to_start' ||
    step.id === 'confirm_pickup';
  const primary = pickupPhase ? origin : destination;
  const secondary = pickupPhase ? destination : origin;

  return (
    <View>
      <OperationalTimeline status={delivery.status} kind={delivery.kind} />
      <View style={styles.explanationBlock}>
        <Text style={styles.stepTitle}>{step.label}</Text>
        <Text style={styles.stepDetail}>{step.detail}</Text>
      </View>
      <LocationBlock title={pickupPhase ? 'Origine' : 'Destination'} place={primary} emphasize hideAction />
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Carte compacte (180) — {current.name}</Text>
      </View>
      <PrimaryButton label="Ouvrir l’itinéraire" onPress={() => undefined} variant="secondary" />
      <View style={styles.detailSection}>
        <SectionLabel>Colis</SectionLabel>
        <Text style={styles.tracking}>{tracking}</Text>
        <Text style={styles.muted}>
          {[sizeLabel, delivery.parcel.recipientName ? `Destinataire · ${delivery.parcel.recipientName}` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <LocationBlock
        title={pickupPhase ? 'Destination' : 'Collecté à'}
        place={secondary}
        secondary
        hideAction
      />
      {action.id ? (
        <PrimaryButton label={action.label} onPress={() => undefined} variant="brand" />
      ) : null}
      {action.id === 'confirm_deposit' ? (
        <DriverSecondaryAction label="Scanner le colis (optionnel)" onPress={() => undefined} icon="maximize" />
      ) : null}
      <DriverSecondaryAction label="Signaler un problème" onPress={() => undefined} icon="alert-triangle" />
      <DriverSecondaryAction label="Contacter le dispatch" onPress={() => undefined} icon="message-circle" />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabsScroll: {
      maxHeight: 48,
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabs: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.successFg,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 48,
    },
    gap: {
      gap: 10,
    },
    queueHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      gap: 12,
    },
    queueCount: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondary,
    },
    queueRoute: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
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
      fontVariant: ['tabular-nums'],
    },
    detailMeta: {
      fontWeight: '500',
      marginBottom: 4,
      color: colors.textMuted,
      fontSize: 14,
    },
    explanationBlock: {
      marginTop: 16,
      marginBottom: 8,
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
    mapPlaceholder: {
      marginVertical: 12,
      height: 160,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    mapPlaceholderText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    secondaryStack: {
      marginTop: 12,
      gap: 8,
    },
    nextBlock: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
    },
    nextKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    nextTitle: {
      marginTop: 6,
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    nextAction: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    nextAddress: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
