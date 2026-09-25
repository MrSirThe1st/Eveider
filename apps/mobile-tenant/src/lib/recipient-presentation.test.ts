import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CustomerParcel } from './api';
import {
  RECIPIENT_HIDDEN_PRIMARY_TABS,
  RECIPIENT_PRIMARY_TABS,
  RECIPIENT_REMOVED_PRIMARY_TABS,
} from './recipient-nav';
import {
  applyRecipientMutationResult,
  canShowCollectionCode,
  getRecipientJourney,
  getRecipientListSection,
  getRecipientParcelStatus,
  getRecipientPrimaryAction,
  getRecipientStatusDetail,
  hasMissingCanonicalCharge,
  isHistoricalRecipientRts,
  isPaymentProviderUnavailable,
  needsRecipientPayment,
  RECIPIENT_FORBIDDEN_UI_COPY,
} from './recipient-presentation';

function parcel(partial: Partial<CustomerParcel>): CustomerParcel {
  return {
    id: 'parcel-1',
    trackingNumber: 'EVD26TEST0001A',
    reference: 'PK-001',
    status: 'created',
    statusLabel: 'CRÉÉ',
    recipientName: 'Marc',
    businessName: 'Boutique Kin',
    pickupType: 'courier_pickup',
    locker: {
      id: 'locker-1',
      name: 'Gombe',
      address: 'Boulevard du 30 Juin',
      latitude: -4.3,
      longitude: 15.3,
    },
    compartmentLabel: 'A1',
    pickupPin: null,
    pickupPayment: null,
    deliveryStatus: null,
    canRequestReturn: false,
    customerReturn: null,
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
    ...partial,
  };
}

describe('Flow 1 journey', () => {
  it('uses transport then arrival then ready then collected', () => {
    const prepared = getRecipientJourney(parcel({ status: 'created' }));
    const transit = getRecipientJourney(parcel({ status: 'in_transit', deliveryStatus: 'scanned' }));
    const arrived = getRecipientJourney(
      parcel({ status: 'delivered_to_locker', deliveryStatus: 'completed' }),
    );
    const ready = getRecipientJourney(parcel({ status: 'ready_for_pickup', pickupPin: '123456' }));
    const collected = getRecipientJourney(parcel({ status: 'collected', canRequestReturn: true }));

    expect(prepared.steps.map((step) => step.label)).toEqual([
      'Colis préparé',
      'En cours de transport',
      'Arrivé au casier',
      'Prêt au retrait',
      'Retiré',
    ]);
    expect(prepared.headline).toBe('Colis préparé');
    expect(transit.headline).toBe('En cours de transport');
    expect(arrived.headline).toBe('Arrivé au casier');
    expect(arrived.steps.find((step) => step.label === 'Prêt au retrait')?.done).toBe(false);
    expect(ready.headline).toBe('Prêt au retrait');
    expect(collected.headline).toBe('Retiré');
    expect(prepared.steps.some((step) => step.label.includes('Chauffeur'))).toBe(false);
  });
});

describe('Flow 2 journey', () => {
  it('never shows Eveider transportation', () => {
    const created = getRecipientJourney(
      parcel({ status: 'created', pickupType: 'merchant_dropoff', deliveryStatus: null }),
    );
    const deposited = getRecipientJourney(
      parcel({
        status: 'delivered_to_locker',
        pickupType: 'merchant_dropoff',
        deliveryStatus: null,
      }),
    );
    const labels = created.steps.map((step) => step.label);
    expect(labels).toEqual(['Colis préparé', 'Déposé au casier', 'Prêt au retrait', 'Retiré']);
    expect(labels.join(' ')).not.toMatch(/transport|Chauffeur/i);
    expect(deposited.headline).toBe('Déposé au casier');
    expect(deposited.steps.find((step) => step.label === 'Prêt au retrait')?.done).toBe(false);
  });
});

describe('AT_POINT vs READY', () => {
  it('does not invite collection or reveal a code at AT_POINT', () => {
    const atPoint = parcel({ status: 'delivered_to_locker', pickupPin: '123456' });
    expect(getRecipientParcelStatus(atPoint)).toBe('Arrivé au casier');
    expect(getRecipientStatusDetail(atPoint)).toMatch(/bientôt prêt au retrait/i);
    expect(canShowCollectionCode(atPoint)).toBe(false);
    expect(getRecipientPrimaryAction(atPoint).id).toBeNull();
    expect(getRecipientListSection(atPoint)).toBe('progress');
  });

  it('shows collection only when READY and authorized', () => {
    const ready = parcel({ status: 'ready_for_pickup', pickupPin: '123456', pickupPayment: {
      required: false,
      status: 'none',
      amount: null,
      currency: null,
      provider: null,
      depositId: null,
      failureReason: null,
    } });
    expect(getRecipientParcelStatus(ready)).toBe('Prêt au retrait');
    expect(canShowCollectionCode(ready)).toBe(true);
    expect(getRecipientPrimaryAction(ready).label).toBe('Voir le code de retrait');
    expect(getRecipientListSection(ready)).toBe('action');
  });
});

describe('payment gating', () => {
  it('hides the collection code when a positive charge is unpaid', () => {
    const unpaid = parcel({
      status: 'ready_for_pickup',
      pickupPin: '123456',
      pickupPayment: {
        required: true,
        status: 'none',
        amount: '7500',
        currency: 'FC',
        provider: null,
        depositId: null,
        failureReason: null,
        kind: 'outbound_delivery',
      },
    });
    expect(needsRecipientPayment(unpaid)).toBe(true);
    expect(canShowCollectionCode(unpaid)).toBe(false);
    expect(getRecipientPrimaryAction(unpaid).label).toBe('Payer les frais');
  });

  it('fails closed when the canonical charge is missing', () => {
    const missing = parcel({
      status: 'ready_for_pickup',
      pickupPin: '123456',
      pickupPayment: {
        required: true,
        status: 'none',
        amount: null,
        currency: null,
        provider: null,
        depositId: null,
        failureReason: null,
        integrityError: 'CANONICAL_CHARGE_MISSING',
      },
    });
    expect(hasMissingCanonicalCharge(missing.pickupPayment)).toBe(true);
    expect(needsRecipientPayment(missing)).toBe(false);
    expect(canShowCollectionCode(missing)).toBe(false);
    expect(getRecipientPrimaryAction(missing).id).toBe('support_charge');
  });

  it('does not treat a missing provider as a free collection', () => {
    const blocked = parcel({
      status: 'ready_for_pickup',
      pickupPin: '123456',
      pickupPayment: {
        required: true,
        status: 'none',
        amount: '7500',
        currency: 'FC',
        provider: null,
        depositId: null,
        failureReason: null,
        paymentProviderAvailable: false,
      },
    });
    expect(needsRecipientPayment(blocked)).toBe(true);
    expect(isPaymentProviderUnavailable(blocked)).toBe(true);
    expect(canShowCollectionCode(blocked)).toBe(false);
    expect(getRecipientPrimaryAction(blocked).id).toBe('retry_payment');
  });

  it('does not reveal a code from a failed payment mutation', () => {
    const previous = parcel({
      status: 'ready_for_pickup',
      pickupPin: null,
      pickupPayment: {
        required: true,
        status: 'none',
        amount: '7500',
        currency: 'FC',
        provider: null,
        depositId: null,
        failureReason: null,
      },
    });
    const next = applyRecipientMutationResult(previous, {
      success: false,
      error: 'Serveur inaccessible (http://127.0.0.1:3000).',
    });
    expect(next.succeeded).toBe(false);
    expect(next.value.pickupPin).toBeNull();
    expect(canShowCollectionCode(next.value)).toBe(false);
  });
});

describe('customer return', () => {
  it('requests a return only after collection', () => {
    expect(getRecipientPrimaryAction(parcel({ status: 'ready_for_pickup' })).id).not.toBe(
      'request_return',
    );
    const collected = parcel({ status: 'collected', canRequestReturn: true });
    expect(getRecipientPrimaryAction(collected).label).toBe('Demander un retour');
  });

  it('shows requested without a return code or locker instruction', () => {
    const requested = parcel({
      status: 'collected',
      customerReturn: {
        id: 'r1',
        status: 'requested',
        statusLabel: 'DEMANDÉ',
        method: null,
        methodLabel: null,
        returnLocker: null,
        returnCode: '654321',
        canCancel: true,
        canDeposit: false,
      },
    });
    expect(getRecipientParcelStatus(requested)).toBe('Retour demandé');
    expect(getRecipientStatusDetail(requested)).toMatch(/décision de l’entreprise/i);
    expect(getRecipientPrimaryAction(requested).id).toBeNull();
  });

  it('builds a Flow 3A journey with return transport', () => {
    const labels = getRecipientJourney(
      parcel({
        status: 'returning',
        customerReturn: {
          id: 'r1',
          status: 'in_transit',
          statusLabel: 'EN TRANSIT',
          method: 'eveider_return',
          methodLabel: 'Retour Eveider',
          returnLocker: { id: 'l1', name: 'Gombe', address: 'Ave 1' },
          returnCode: null,
          canCancel: false,
          canDeposit: false,
        },
      }),
    ).steps.map((step) => step.label);
    expect(labels).toEqual([
      'Retour demandé',
      'Retour autorisé',
      'Retour déposé au casier',
      'Retour en cours',
      'Retourné à l’entreprise',
    ]);
  });

  it('builds a Flow 3B journey without fake return transport', () => {
    const labels = getRecipientJourney(
      parcel({
        status: 'return_at_point',
        customerReturn: {
          id: 'r1',
          status: 'awaiting_pickup',
          statusLabel: 'EN ATTENTE',
          method: 'business_pickup',
          methodLabel: 'Retrait entreprise',
          returnLocker: { id: 'l1', name: 'Gombe', address: 'Ave 1' },
          returnCode: null,
          canCancel: false,
          canDeposit: false,
        },
      }),
    ).steps.map((step) => step.label);
    expect(labels).toEqual([
      'Retour demandé',
      'Retour autorisé',
      'Retour déposé au casier',
      'Retourné à l’entreprise',
    ]);
    expect(labels).not.toContain('Retour en cours');
  });

  it('labels historical RTS distinctly', () => {
    const rts = parcel({ status: 'returned', customerReturn: null });
    expect(isHistoricalRecipientRts(rts)).toBe(true);
    expect(getRecipientParcelStatus(rts)).toBe('Retour à l’expéditeur');
    expect(getRecipientParcelStatus(rts)).not.toBe('Retour client');
    expect(getRecipientPrimaryAction(rts).id).toBeNull();
  });
});

describe('recipient navigation and hardware boundary', () => {
  it('exposes Accueil, Mes colis and Points (Envoyer hidden for now)', () => {
    expect(RECIPIENT_PRIMARY_TABS.map((tab) => tab.label)).toEqual([
      'Accueil',
      'Mes colis',
      'Points',
    ]);
    expect(RECIPIENT_HIDDEN_PRIMARY_TABS).toEqual(['Envoyer']);
    expect(RECIPIENT_REMOVED_PRIMARY_TABS).toEqual(['Casiers']);
  });

  it('does not expose locker control or credential internals in Recipient UI source', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const files = [
      'screens/ReceiveScreen.tsx',
      'navigation/CustomerNavigator.tsx',
      'components/ParcelCard.tsx',
      'components/ParcelTimeline.tsx',
      'components/CommissioningCollectConfirm.tsx',
    ].map((relative) => readFileSync(join(root, relative), 'utf8'));
    const source = files.join('\n');
    const navigator = readFileSync(join(root, 'navigation/CustomerNavigator.tsx'), 'utf8');

    expect(navigator).toContain('CustomerHome');
    expect(navigator).toContain('name="Points"');
    expect(navigator).not.toContain('name="Send"');
    expect(navigator).toContain('name="Receive"');
    expect(existsSync(join(root, 'screens/CustomerHome.tsx'))).toBe(true);
    expect(existsSync(join(root, 'screens/PointsScreen.tsx'))).toBe(true);
    expect(existsSync(join(root, 'screens/SendScreen.tsx'))).toBe(true);

    for (const forbidden of RECIPIENT_FORBIDDEN_UI_COPY) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toMatch(/openCompartment|selectCompartment|node-red|pinHash|lockerSession/i);
    expect(source).not.toContain('assignCustomerParcelLocker');
  });
});
