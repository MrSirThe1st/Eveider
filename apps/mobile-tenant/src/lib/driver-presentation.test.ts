import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { DeliveryKind, DeliveryStatus } from '@eveider/domain';
import { DRIVER_CONTEXTUAL_ROUTE_SCREEN, DRIVER_PRIMARY_TABS, DRIVER_REMOVED_PRIMARY_TABS } from './driver-nav';
import {
  applyDriverMutationResult,
  buildDriverRouteLegs,
  canDriverActOnDelivery,
  DRIVER_FORBIDDEN_UI_COPY,
  getDriverCurrentStop,
  getDriverDeadlineDisplay,
  getDriverDeliveryKindLabel,
  getDriverDeliveryStep,
  getDriverDestination,
  getDriverIssueReasons,
  getDriverMovementLabel,
  getDriverOrigin,
  getDriverParcelActionLabel,
  getDriverPrimaryAction,
  getDriverRecordSummary,
  getDriverSuccessCopy,
  getDriverTaskTypeIcon,
  isAssignedEveiderDriverJob,
  isHistoryDriverDelivery,
  matchesDriverParcelCode,
  shortDriverPlaceName,
  sortDeliveriesByDeadline,
  summarizeDriverRoute,
  translateDriverError,
  type DriverDeliveryLike,
} from './driver-presentation';

function delivery(
  partial: Partial<DriverDeliveryLike> & {
    status: DeliveryStatus;
    kind?: DeliveryKind;
  },
): DriverDeliveryLike {
  return {
    id: partial.id ?? 'delivery-1',
    status: partial.status,
    kind: partial.kind ?? 'outbound',
    completedAt: partial.completedAt ?? null,
    createdAt: partial.createdAt ?? '2026-09-19T08:00:00.000Z',
    dueAt: partial.dueAt ?? null,
    driverInstructions: partial.driverInstructions ?? null,
    parcel: {
      trackingNumber: 'EVD26TEST0001A',
      reference: 'PK-001',
      status: 'created',
      recipientName: 'Amina',
      businessName: 'Entreprise ABC',
      senderAddress: '12 Avenue du Commerce',
      packageSize: 'medium',
      locker: {
        name: 'Gombe',
        address: 'Boulevard du 30 Juin',
        latitude: -4.3,
        longitude: 15.3,
      },
      compartmentLabel: null,
      ...partial.parcel,
    },
  };
}

describe('driver kind and movement labels', () => {
  it('labels Flow 1 as Entreprise → casier', () => {
    expect(getDriverDeliveryKindLabel(delivery({ status: 'assigned', kind: 'outbound' }))).toBe(
      'Entreprise → casier',
    );
  });

  it('labels Flow 3A as Casier → entreprise, never Retour alone', () => {
    expect(
      getDriverDeliveryKindLabel(delivery({ status: 'assigned', kind: 'customer_return' })),
    ).toBe('Casier → entreprise');
    expect(
      getDriverDeliveryKindLabel(delivery({ status: 'assigned', kind: 'customer_return' })),
    ).not.toBe('Retour');
  });

  it('labels legacy RTS distinctly', () => {
    expect(getDriverDeliveryKindLabel(delivery({ status: 'completed', kind: 'return' }))).toBe(
      'Retour non retiré',
    );
    expect(getDriverDeliveryKindLabel(delivery({ status: 'completed', kind: 'return' }))).not.toBe(
      'Casier → entreprise',
    );
  });

  it('uses explicit movement labels for the current stop', () => {
    expect(getDriverMovementLabel(delivery({ status: 'assigned', kind: 'outbound' }))).toBe(
      'Collecte entreprise',
    );
    expect(getDriverMovementLabel(delivery({ status: 'scanned', kind: 'outbound' }))).toBe(
      'Dépôt au casier',
    );
    expect(getDriverMovementLabel(delivery({ status: 'assigned', kind: 'customer_return' }))).toBe(
      'Collecte au casier',
    );
    expect(getDriverMovementLabel(delivery({ status: 'scanned', kind: 'customer_return' }))).toBe(
      'Retour entreprise',
    );
  });
});

describe('Flow 1 Aller presentation', () => {
  it('shows business origin and locker destination before pickup', () => {
    const job = delivery({ status: 'assigned', kind: 'outbound' });
    const origin = getDriverOrigin(job);
    const destination = getDriverDestination(job);
    const step = getDriverDeliveryStep(job);

    expect(origin.role).toBe('Entreprise');
    expect(origin.action).toBe('Collecte');
    expect(origin.name).toBe('Entreprise ABC');
    expect(origin.address).toBe('12 Avenue du Commerce');
    expect(origin.latitude).toBeNull();
    expect(origin.longitude).toBeNull();
    expect(destination.role).toBe('Casier');
    expect(destination.name).toContain('Gombe');
    expect(step.label).toBe('À accepter');
    expect(getDriverPrimaryAction(job).label).toBe('Maintenir pour accepter');
    expect(getDriverPrimaryAction(job).label).not.toMatch(/transit|livré|statut/i);
  });

  it('uses snapshotted pickup location details for navigation and contact', () => {
    const job = delivery({
      status: 'assigned',
      kind: 'outbound',
      parcel: {
        trackingNumber: 'EVD26TEST0001A',
        businessName: 'Entreprise ABC',
        senderName: 'Mulikap',
        senderPhone: '+2430551609849',
        senderAddress: '14 Avenue du Commerce',
        senderLocationName: 'Entrepôt principal',
        senderLat: -10.71,
        senderLng: 25.47,
        senderInstructions: 'Entrée arrière',
        locker: {
          name: 'Gombe',
          address: 'Boulevard du 30 Juin',
          latitude: -4.3,
          longitude: 15.3,
        },
      },
    });
    const origin = getDriverOrigin(job);
    expect(origin.name).toBe('Entrepôt principal');
    expect(origin.latitude).toBe(-10.71);
    expect(origin.longitude).toBe(25.47);
    expect(origin.contactName).toBe('Mulikap');
    expect(origin.contactPhone).toBe('+2430551609849');
    expect(origin.instructions).toBe('Entrée arrière');
  });

  it('becomes Se rendre au casier after scan', () => {
    const job = delivery({ status: 'scanned', kind: 'outbound' });
    expect(getDriverDeliveryStep(job).label).toBe('Se rendre au casier');
    expect(getDriverCurrentStop(job).role).toBe('Casier');
    expect(getDriverSuccessCopy(job, 'scan').title).toBe('Colis récupéré');
  });

  it('gates accept → start → confirm pickup before physical work', () => {
    expect(getDriverPrimaryAction(delivery({ status: 'assigned' })).id).toBe('accept_delivery');
    expect(getDriverPrimaryAction(delivery({ status: 'accepted' })).id).toBe('start_delivery');
    expect(getDriverPrimaryAction(delivery({ status: 'started' })).id).toBe('confirm_pickup');
    expect(getDriverDeliveryStep(delivery({ status: 'started' })).label).toBe(
      'Confirmer la prise en charge',
    );
  });

  it('formats deadlines as overdue / Avant time / tomorrow / none', () => {
    const now = new Date('2026-09-26T12:00:00.000Z');
    expect(getDriverDeadlineDisplay(null, now).label).toBe('Sans échéance');
    expect(getDriverDeadlineDisplay('2026-09-26T10:00:00.000Z', now).kind).toBe('overdue');
    const soon = getDriverDeadlineDisplay('2026-09-26T12:30:00.000Z', now);
    expect(soon.kind).toBe('minutes');
    expect(soon.label).toMatch(/^Avant /);
    expect(getDriverDeadlineDisplay('2026-09-27T12:00:00.000Z', now).kind).toBe('tomorrow');
  });

  it('maps task type icons and shortens locker place names', () => {
    expect(getDriverTaskTypeIcon({ status: 'started', kind: 'outbound' })).toBe('package');
    expect(getDriverTaskTypeIcon({ status: 'scanned', kind: 'outbound' })).toBe('map-pin');
    expect(getDriverTaskTypeIcon({ status: 'started', kind: 'customer_return' })).toBe('package');
    expect(shortDriverPlaceName('Casier Eveider KAM')).toBe('Eveider KAM');
    expect(shortDriverPlaceName('Boutique Kenya')).toBe('Boutique Kenya');
  });

  it('sorts overdue then nearest then no deadline', () => {
    const now = new Date('2026-09-26T12:00:00.000Z');
    const sorted = sortDeliveriesByDeadline(
      [
        delivery({ id: 'none', status: 'assigned', dueAt: null }),
        delivery({ id: 'later', status: 'assigned', dueAt: '2026-09-26T18:00:00.000Z' }),
        delivery({ id: 'overdue', status: 'assigned', dueAt: '2026-09-26T08:00:00.000Z' }),
      ],
      now,
    );
    expect(sorted.map((item) => item.id)).toEqual(['overdue', 'later', 'none']);
  });

  it('advances locker deposit via confirm, then photo proof', () => {
    const enRoute = delivery({ status: 'scanned', kind: 'outbound' });
    const proof = delivery({ status: 'drop_off_pending', kind: 'outbound' });
    expect(getDriverPrimaryAction(enRoute).id).toBe('confirm_deposit');
    expect(getDriverPrimaryAction(enRoute).label).toBe('Confirmer le dépôt');
    expect(getDriverDeliveryStep(enRoute).detail).toContain('confirmez le colis');
    expect(getDriverDeliveryStep(proof).label).toBe('Preuve de dépôt');
    expect(getDriverDeliveryStep(proof).detail).toContain('Photographiez');
    expect(getDriverSuccessCopy(proof, 'deposit').detail).toBe('Cette livraison est terminée.');
  });
});

describe('Flow 3A return presentation', () => {
  it('shows locker as origin and business as destination', () => {
    const job = delivery({ status: 'assigned', kind: 'customer_return' });
    expect(getDriverOrigin(job).role).toBe('Casier');
    expect(getDriverDestination(job).role).toBe('Entreprise');
    expect(getDriverDestination(job).name).toBe('Entreprise ABC');
    expect(getDriverDeliveryStep(job).label).toBe('À accepter');
  });

  it('after locker pickup, next stop is the business', () => {
    const job = delivery({ status: 'scanned', kind: 'customer_return' });
    expect(getDriverDeliveryStep(job).label).toBe('Retour en transport');
    expect(getDriverCurrentStop(job).role).toBe('Entreprise');
    expect(getDriverPrimaryAction(job).label).toBe('Confirmer la remise');
    expect(getDriverSuccessCopy(job, 'scan').title).toBe('Retour récupéré');
    expect(getDriverSuccessCopy(job, 'handoff').title).toBe('Retour remis à l’entreprise');
  });
});

describe('Flow 2 and Flow 3B exclusion', () => {
  it('does not invent Driver work from a Business drop-off parcel', () => {
    expect(
      isAssignedEveiderDriverJob({
        pickupType: 'merchant_dropoff',
        deliveryKind: null,
      }),
    ).toBe(false);
  });

  it('does not invent Driver work from a Business locker pickup return', () => {
    expect(
      isAssignedEveiderDriverJob({
        returnMethod: 'return_locker',
        deliveryKind: null,
      }),
    ).toBe(false);
  });

  it('only shows real assigned Eveider deliveries', () => {
    expect(isAssignedEveiderDriverJob({ deliveryKind: 'outbound' })).toBe(true);
    expect(isAssignedEveiderDriverJob({ deliveryKind: 'customer_return' })).toBe(true);
  });
});

describe('historical RTS and history split', () => {
  it('blocks new RTS actions', () => {
    const activeLegacy = delivery({ status: 'assigned', kind: 'return' });
    expect(canDriverActOnDelivery(activeLegacy)).toBe(false);
    expect(getDriverPrimaryAction(activeLegacy).id).toBeNull();
    expect(getDriverDeliveryStep(activeLegacy).label).toBe('Retour non retiré');
  });

  it('keeps completed work in history', () => {
    expect(isHistoryDriverDelivery(delivery({ status: 'completed', kind: 'outbound' }))).toBe(true);
    expect(isHistoryDriverDelivery(delivery({ status: 'assigned', kind: 'outbound' }))).toBe(false);
  });

  it('builds a record summary for completed and RTS jobs', () => {
    const completed = getDriverRecordSummary(
      delivery({
        status: 'completed',
        kind: 'outbound',
        completedAt: '2026-09-26T14:32:00.000Z',
      }),
    );
    expect(completed.title).toBe('Dépôt confirmé');
    expect(completed.tone).toBe('success');
    expect(completed.subtitle).toMatch(/14:32|16:32/);

    const rts = getDriverRecordSummary(delivery({ status: 'assigned', kind: 'return' }));
    expect(rts.title).toBe('Retour non retiré');
    expect(rts.subtitle).toBe('Aucun retrait effectué');
    expect(rts.tone).toBe('danger');
  });
});

describe('scan validation and queue presentation', () => {
  it('matches tracking or reference case-insensitively', () => {
    const job = delivery({ status: 'scanned', kind: 'outbound' });
    expect(matchesDriverParcelCode(job, 'evd26test0001a')).toBe(true);
    expect(matchesDriverParcelCode(job, 'PK-001')).toBe(true);
    expect(matchesDriverParcelCode(job, 'WRONG')).toBe(false);
  });

  it('surfaces the next physical action on the queue card', () => {
    expect(getDriverParcelActionLabel(delivery({ status: 'assigned', kind: 'outbound' }))).toBe(
      'À accepter',
    );
    expect(getDriverParcelActionLabel(delivery({ status: 'started', kind: 'outbound' }))).toBe(
      '1 colis à confirmer',
    );
    expect(getDriverParcelActionLabel(delivery({ status: 'scanned', kind: 'outbound' }))).toBe(
      '1 colis à déposer',
    );
  });

  it('offers contextual issue reasons for pickup vs locker', () => {
    const pickup = getDriverIssueReasons(delivery({ status: 'assigned', kind: 'outbound' }));
    expect(pickup.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Entreprise fermée / indisponible', 'Colis introuvable']),
    );
    const deposit = getDriverIssueReasons(delivery({ status: 'scanned', kind: 'outbound' }));
    expect(deposit.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Casier indisponible', 'Le colis ne rentre pas']),
    );
  });
});

describe('multi-stop itinerary legs', () => {
  it('expands assigned jobs into collect then deposit legs', () => {
    const legs = buildDriverRouteLegs([
      delivery({
        id: 'd1',
        status: 'assigned',
        kind: 'outbound',
        parcel: {
          trackingNumber: 'A',
          businessName: 'Mulikap',
          senderLocationName: 'Mulikap',
          senderAddress: 'Kamina',
          senderLat: -10.7,
          senderLng: 25.4,
          locker: {
            name: 'Kolwezi',
            address: 'Kolwezi centre',
            latitude: -10.7,
            longitude: 25.5,
          },
        },
      }),
      delivery({
        id: 'd2',
        status: 'scanned',
        kind: 'outbound',
        parcel: {
          trackingNumber: 'B',
          businessName: 'Business B',
          senderLocationName: 'Business B',
          locker: {
            name: 'Kolwezi',
            address: 'Kolwezi centre',
            latitude: -10.7,
            longitude: 25.5,
          },
        },
      }),
    ]);
    expect(legs.some((leg) => leg.kind === 'collect' && leg.name === 'Mulikap')).toBe(true);
    const kolwezi = legs.find((leg) => leg.kind === 'deposit' && leg.name.includes('Kolwezi'));
    expect(kolwezi?.parcelCount).toBe(2);
    expect(summarizeDriverRoute(legs).parcelCount).toBe(2);
  });
});

describe('network fail-closed', () => {
  it('does not visually complete a job when the backend fails', () => {
    const previous = delivery({ status: 'assigned', kind: 'outbound' });
    const next = applyDriverMutationResult(previous, {
      success: false,
      error: 'Serveur inaccessible (http://127.0.0.1:3000).',
    });
    expect(next.succeeded).toBe(false);
    expect(next.delivery.status).toBe('assigned');
    expect(next.error).toMatch(/réseau indisponible/i);
  });

  it('updates only from the backend payload on success', () => {
    const previous = delivery({ status: 'assigned', kind: 'outbound' });
    const next = applyDriverMutationResult(previous, {
      success: true,
      data: { delivery: delivery({ status: 'scanned', kind: 'outbound' }) },
    });
    expect(next.succeeded).toBe(true);
    expect(next.delivery.status).toBe('scanned');
    expect(next.error).toBeNull();
  });

  it('hides internal errors', () => {
    expect(translateDriverError('SELECT * FROM parcels WHERE id = $1')).toBe(
      'Action impossible pour le moment. Réessayez.',
    );
  });
});

describe('driver navigation constants', () => {
  it('exposes Livraisons and Historique as the only primary tabs', () => {
    expect(DRIVER_PRIMARY_TABS.map((tab) => tab.label)).toEqual(['Livraisons', 'Historique']);
    expect(DRIVER_CONTEXTUAL_ROUTE_SCREEN).toBe('Route');
    expect(DRIVER_REMOVED_PRIMARY_TABS).toEqual(
      expect.arrayContaining(['Accueil', 'Itinéraire', 'Chat', 'Points', 'Colis']),
    );
  });
});

describe('hardware boundary in Driver UI source', () => {
  it('does not expose locker control, PIN, payment, or PLC copy', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const files = [
      'screens/CourierHome.tsx',
      'screens/CourierHistoryScreen.tsx',
      'screens/CourierStatsScreen.tsx',
      'screens/CourierRouteScreen.tsx',
      'navigation/CourierNavigator.tsx',
      'components/DeliveryCard.tsx',
      'components/DeliveryStatusBadge.tsx',
      'components/DeliveryStepIndicator.tsx',
      'components/LocationBlock.tsx',
      'components/RouteStopRow.tsx',
      'components/DriverEmptyState.tsx',
      'components/DriverSummaryCard.tsx',
      'components/CommissioningLockerDeposit.tsx',
      'components/DropOffProofCard.tsx',
    ].map((relative) => readFileSync(join(root, relative), 'utf8'));
    const source = files.join('\n');

    const navigatorSource = readFileSync(join(root, 'navigation/CourierNavigator.tsx'), 'utf8');
    const tabSection = navigatorSource.split('Tab.Navigator')[1]?.split('/Tab.Navigator')[0] ?? '';
    expect(tabSection).toContain('name="Home"');
    expect(tabSection).toContain('name="History"');
    expect(tabSection).not.toContain('name="Route"');
    expect(navigatorSource).toContain('DRIVER_PRIMARY_TABS');
    expect(navigatorSource).toContain('<Stack.Screen name="Route"');
    expect(navigatorSource).not.toMatch(/name="Chat"/);
    expect(navigatorSource).not.toMatch(/name="Points"/);
    expect(navigatorSource).not.toContain('COURSIER');
    expect(navigatorSource).toContain('mode="DRIVER"');

    for (const forbidden of DRIVER_FORBIDDEN_UI_COPY) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toMatch(/pickupPin|returnCode|pawapay/i);
    expect(source).not.toMatch(/openCompartment|selectCompartment|node-red/i);
  });
});

