import type { CourierDelivery } from './api';

const LOCKER_KOLWEZI = {
  id: 'locker-kolwezi',
  name: 'Kolwezi Point — Avenue des Mines',
  address:
    'Avenue des Mines n°45 bis, quartier Manika, commune de Dilala, Kolwezi, Lualaba, RDC',
  latitude: -10.7167,
  longitude: 25.4724,
  status: 'active' as const,
  statusLabel: 'Actif',
  canAcceptDropOff: true,
};

const LOCKER_MANIKA = {
  id: 'locker-manika',
  name: 'Manika Express Hub',
  address: 'Croisement Blvd Lumumba / Av. Kapenda, Manika, Kolwezi',
  latitude: -10.721,
  longitude: 25.468,
  status: 'active' as const,
  statusLabel: 'Actif',
  canAcceptDropOff: true,
};

const LOCKER_GOMBE = {
  id: 'locker-gombe',
  name: 'Gombe Centre',
  address: 'Boulevard du 30 Juin, Gombe, Kinshasa',
  latitude: -4.305,
  longitude: 15.31,
  status: 'active' as const,
  statusLabel: 'Actif',
  canAcceptDropOff: true,
};

function base(
  partial: Partial<CourierDelivery> & {
    id: string;
    status: CourierDelivery['status'];
    parcel: CourierDelivery['parcel'];
  },
): CourierDelivery {
  return {
    statusLabel: partial.status,
    scannedAt: null,
    completedAt: null,
    createdAt: '2026-09-26T06:00:00.000Z',
    updatedAt: '2026-09-26T08:00:00.000Z',
    hasDropOffPhoto: false,
    kind: 'outbound',
    kindLabel: 'Aller',
    ...partial,
  };
}

/** Ugly real-world fixtures for visual QA — long names, addresses, instructions, multi-stop. */
export const DRIVER_VISUAL_QA_ACTIVE: CourierDelivery[] = [
  base({
    id: 'qa-1',
    status: 'assigned',
    parcel: {
      id: 'p1',
      trackingNumber: 'EVD26APNA9A8JZ',
      reference: 'CMD-2026-MULIKAP-00087',
      status: 'created',
      recipientName: 'Jean-Baptiste Mukendi wa Kabongo',
      businessName:
        'Société Minière et Commerciale Mulikap International SARL — Entrepôt Principal Dilala',
      senderName: 'Patrick Kalala (responsable logistique)',
      senderPhone: '+243 955 160 984',
      senderLocationName:
        'Entrepôt principal Mulikap — Zone industrielle Dilala / Hangar B',
      senderAddress:
        'Avenue Kapenda n°128/Bis, croisement avec Avenue des Mines, quartier Industrial, commune de Dilala, Kolwezi, province du Lualaba, République Démocratique du Congo',
      senderLat: -10.7145,
      senderLng: 25.4698,
      senderInstructions:
        'Entrée arrière, portail bleu. Sonner deux fois puis demander Patrick au bureau logistique. Ne pas stationner devant le hangar A. Si fermé, appeler avant 17h.',
      packageSize: 'large',
      locker: LOCKER_KOLWEZI,
      compartmentId: null,
      compartmentLabel: null,
    },
  }),
  base({
    id: 'qa-2',
    status: 'assigned',
    parcel: {
      id: 'p2',
      trackingNumber: 'EVD26BXK91L2MQ',
      reference: 'PK-4421',
      status: 'created',
      recipientName: 'Amina',
      businessName: 'Pharmacie Espoir & Bien-être de Manika',
      senderName: 'Dr. Mbayo',
      senderPhone: '+243 810 000 112',
      senderLocationName: 'Pharmacie Espoir Manika',
      senderAddress:
        'Avenue Lumumba n°7, face à l’église Méthodiste, Manika, Kolwezi',
      senderLat: -10.719,
      senderLng: 25.471,
      senderInstructions: 'Demander au comptoir « colis Eveider ».',
      packageSize: 'small',
      locker: LOCKER_MANIKA,
      compartmentId: null,
      compartmentLabel: null,
    },
  }),
  base({
    id: 'qa-3',
    status: 'scanned',
    scannedAt: '2026-09-26T07:30:00.000Z',
    parcel: {
      id: 'p3',
      trackingNumber: 'EVD26CDX77P3RT',
      reference: null,
      status: 'in_transit',
      recipientName: 'Grace Ilunga',
      businessName: 'Boutique Mode & Accessoires « Chez Mama Rose »',
      senderName: 'Mama Rose',
      senderPhone: '+243 970 111 222',
      senderLocationName: 'Chez Mama Rose',
      senderAddress: 'Marché de Manika, allée 4, stand 12-14',
      senderLat: -10.718,
      senderLng: 25.47,
      senderInstructions: null,
      packageSize: 'medium',
      locker: LOCKER_KOLWEZI,
      compartmentId: 'c-12',
      compartmentLabel: 'B12',
    },
  }),
  base({
    id: 'qa-4',
    status: 'drop_off_pending',
    scannedAt: '2026-09-26T07:10:00.000Z',
    parcel: {
      id: 'p4',
      trackingNumber: 'EVD26EFG55H8JK',
      reference: 'RET-88',
      status: 'in_transit',
      recipientName: 'Paul Kasongo',
      businessName: 'Electro Plus Kolwezi',
      senderName: 'Serge',
      senderPhone: '+243 822 333 444',
      senderLocationName: 'Electro Plus',
      senderAddress: 'Av. Mobutu, Kolwezi',
      senderLat: -10.71,
      senderLng: 25.46,
      packageSize: 'xlarge',
      locker: LOCKER_MANIKA,
      compartmentId: 'c-03',
      compartmentLabel: 'A03',
    },
  }),
  base({
    id: 'qa-5',
    status: 'assigned',
    kind: 'customer_return',
    kindLabel: 'Retour client',
    parcel: {
      id: 'p5',
      trackingNumber: 'EVD26RTN01XYZ9',
      reference: 'RETURN-CUSTOMER-LONG-REF',
      status: 'ready_for_pickup',
      recipientName: 'Société Minière et Commerciale Mulikap International SARL',
      businessName:
        'Société Minière et Commerciale Mulikap International SARL — Entrepôt Principal Dilala',
      senderName: 'Patrick Kalala',
      senderPhone: '+243 955 160 984',
      senderLocationName: 'Entrepôt principal Mulikap',
      senderAddress:
        'Avenue Kapenda n°128/Bis, croisement avec Avenue des Mines, Dilala, Kolwezi',
      senderLat: -10.7145,
      senderLng: 25.4698,
      senderInstructions: 'Remise uniquement à Patrick ou son adjoint Joseph.',
      packageSize: 'medium',
      locker: LOCKER_GOMBE,
      compartmentId: 'c-22',
      compartmentLabel: 'C22',
    },
  }),
  base({
    id: 'qa-6',
    status: 'scanned',
    kind: 'customer_return',
    scannedAt: '2026-09-26T08:00:00.000Z',
    parcel: {
      id: 'p6',
      trackingNumber: 'EVD26RTN02ABC1',
      reference: null,
      status: 'in_transit',
      recipientName: 'Mulikap',
      businessName: 'Mulikap',
      senderName: 'Patrick',
      senderPhone: '+243 955 160 984',
      senderLocationName: 'Entrepôt Mulikap',
      senderAddress: 'Av. Kapenda 128, Dilala',
      senderLat: -10.715,
      senderLng: 25.47,
      packageSize: 'small',
      locker: LOCKER_KOLWEZI,
      compartmentId: null,
      compartmentLabel: null,
    },
  }),
];

export const DRIVER_VISUAL_QA_HISTORY: CourierDelivery[] = [
  base({
    id: 'qa-h1',
    status: 'completed',
    completedAt: '2026-09-25T16:20:00.000Z',
    hasDropOffPhoto: true,
    parcel: {
      id: 'ph1',
      trackingNumber: 'EVD26DONE01',
      reference: null,
      status: 'ready_for_pickup',
      recipientName: 'Claire',
      businessName: 'Café du Centre',
      senderAddress: 'Gombe',
      senderLocationName: 'Café du Centre',
      packageSize: 'small',
      locker: LOCKER_GOMBE,
      compartmentId: 'c-01',
      compartmentLabel: 'A01',
    },
  }),
  base({
    id: 'qa-h2',
    status: 'failed',
    completedAt: '2026-09-24T11:05:00.000Z',
    parcel: {
      id: 'ph2',
      trackingNumber: 'EVD26FAIL99LONGTRACKING',
      reference: 'INCIDENT-ENTREPRISE-FERMEE',
      status: 'created',
      recipientName: 'Client inconnu avec un nom très long pour tester le wrap',
      businessName:
        'Entreprise Fermée Temporairement — Groupe Commercial des Grands Lacs Orientaux SA',
      senderLocationName: 'Site inaccessible Dilala',
      senderAddress:
        'Route de Kasulo km 12, après le poste de péage, sans numéro visible, commune de Dilala, Kolwezi',
      senderInstructions: 'Incident: portail verrouillé toute la journée. Dispatch informé.',
      packageSize: 'large',
      locker: LOCKER_KOLWEZI,
      compartmentId: null,
      compartmentLabel: null,
    },
  }),
];
