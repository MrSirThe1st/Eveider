import type { DeliveryKind, DeliveryStatus, PackageSize } from '@eveider/domain';
import { ACTIVE_DELIVERY_STATUSES, PACKAGE_SIZE_LABELS } from '@eveider/domain';

export const DRIVER_ACTIVE_STATUSES: readonly DeliveryStatus[] = ACTIVE_DELIVERY_STATUSES;

export const DRIVER_HISTORY_STATUSES: DeliveryStatus[] = ['completed', 'failed'];

export type DriverDeliveryLike = {
  id: string;
  status: DeliveryStatus;
  kind?: DeliveryKind | null;
  completedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string;
  dueAt?: string | null;
  scannedAt?: string | null;
  driverInstructions?: string | null;
  parcel: {
    trackingNumber: string;
    reference?: string | null;
    status?: string;
    recipientName?: string | null;
    businessName: string;
    senderName?: string | null;
    senderPhone?: string | null;
    senderAddress?: string | null;
    senderLocationName?: string | null;
    senderLat?: number | null;
    senderLng?: number | null;
    senderInstructions?: string | null;
    packageSize?: PackageSize | string | null;
    locker: {
      name: string;
      address: string;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    compartmentLabel?: string | null;
  };
};

export type DriverPlace = {
  role: 'Entreprise' | 'Casier';
  action: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
};

export type DriverStepId =
  | 'awaiting_accept'
  | 'ready_to_start'
  | 'confirm_pickup'
  | 'awaiting_business_pickup'
  | 'en_route_locker'
  | 'locker_deposit'
  | 'awaiting_locker_pickup'
  | 'returning_to_business'
  | 'business_handoff'
  | 'completed'
  | 'failed'
  | 'historical_rts';

export type DriverPrimaryActionId =
  | 'accept_delivery'
  | 'start_delivery'
  | 'confirm_pickup'
  | 'scan_parcel'
  | 'confirm_deposit'
  | 'commissioning_deposit_proof'
  | 'confirm_business_handoff'
  | null;

export type DriverDeadlineKind = 'overdue' | 'minutes' | 'today' | 'tomorrow' | 'none';

export type DriverDeadlineDisplay = {
  kind: DriverDeadlineKind;
  label: string;
  minutesUntil?: number;
};

export type DriverIssueReason = {
  id: string;
  label: string;
  type: 'failed_delivery' | 'locker_unavailable' | 'parcel_problem' | 'locker_system';
};

export type DriverRouteLeg = {
  id: string;
  deliveryIds: string[];
  kind: 'collect' | 'deposit';
  kindLabel: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  parcelCount: number;
  actionLabel: string;
  dueAt?: string | null;
};

export type DriverActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Presentation only — backend remains the source of truth for assignment. */
export function getDriverDeliveryKind(delivery: Pick<DriverDeliveryLike, 'kind'>): DeliveryKind {
  return delivery.kind ?? 'outbound';
}

/** Coarse flow direction (business↔locker), independent of current step. */
export function getDriverDeliveryKindLabel(delivery: Pick<DriverDeliveryLike, 'kind'>): string {
  const kind = getDriverDeliveryKind(delivery);
  if (kind === 'customer_return') return 'Casier → entreprise';
  if (kind === 'return') return 'Retour non retiré';
  return 'Entreprise → casier';
}

/**
 * Operational movement for the driver's current (or last) stop.
 * Prefer this on queue cards over parcel status labels.
 */
export function getDriverMovementLabel(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): string {
  if (isHistoricalRts(delivery)) return 'Retour non retiré';

  if (isCustomerReturnJob(delivery)) {
    if (
      delivery.status === 'assigned' ||
      delivery.status === 'accepted' ||
      delivery.status === 'started'
    ) {
      return 'Collecte au casier';
    }
    return 'Retour entreprise';
  }

  if (
    delivery.status === 'assigned' ||
    delivery.status === 'accepted' ||
    delivery.status === 'started'
  ) {
    return 'Collecte entreprise';
  }
  return 'Dépôt au casier';
}

export function isHistoricalRts(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'return';
}

export function isCustomerReturnJob(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'customer_return';
}

export function isOutboundAller(delivery: Pick<DriverDeliveryLike, 'kind'>): boolean {
  return getDriverDeliveryKind(delivery) === 'outbound';
}

export function isActiveDriverDelivery(delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>): boolean {
  return DRIVER_ACTIVE_STATUSES.includes(delivery.status);
}

export function isHistoryDriverDelivery(delivery: Pick<DriverDeliveryLike, 'status'>): boolean {
  return DRIVER_HISTORY_STATUSES.includes(delivery.status);
}

export function canDriverActOnDelivery(delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>): boolean {
  return isActiveDriverDelivery(delivery) && !isHistoricalRts(delivery);
}

/**
 * Driver work exists only as an assigned Eveider Livraison.
 * Flow 2 (merchant_dropoff) and Flow 3B (return_locker) never appear without a delivery.
 */
export function isAssignedEveiderDriverJob(input: {
  deliveryKind?: DeliveryKind | null;
  pickupType?: string | null;
  returnMethod?: string | null;
}): boolean {
  if (!input.deliveryKind) return false;
  return (
    input.deliveryKind === 'outbound' ||
    input.deliveryKind === 'customer_return' ||
    input.deliveryKind === 'return'
  );
}

export function getDriverDeliveryStep(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): { id: DriverStepId; label: string; detail: string } {
  if (isHistoricalRts(delivery)) {
    return {
      id: 'historical_rts',
      label: 'Retour non retiré',
      detail: 'Aucun retrait effectué. Cette tâche est en lecture seule.',
    };
  }

  if (delivery.status === 'failed') {
    return { id: 'failed', label: 'Incident', detail: 'Cette livraison n’a pas pu être terminée.' };
  }

  if (delivery.status === 'completed') {
    return {
      id: 'completed',
      label: isCustomerReturnJob(delivery) ? 'Retour remis' : 'Dépôt confirmé',
      detail: 'Cette livraison est terminée.',
    };
  }

  if (delivery.status === 'assigned') {
    return {
      id: 'awaiting_accept',
      label: 'À accepter',
      detail: 'Acceptez cette livraison pour la prendre en charge.',
    };
  }

  if (delivery.status === 'accepted') {
    return {
      id: 'ready_to_start',
      label: 'Prêt à commencer',
      detail: 'Commencez lorsque vous êtes en route vers le point de collecte.',
    };
  }

  if (isCustomerReturnJob(delivery)) {
    if (delivery.status === 'started') {
      return {
        id: 'confirm_pickup',
        label: 'Confirmer la prise en charge',
        detail: 'Scannez ou sélectionnez le colis au casier. Le terminal autorise l’ouverture.',
      };
    }
    if (delivery.status === 'scanned') {
      return {
        id: 'returning_to_business',
        label: 'Retour en transport',
        detail: 'Ramenez maintenant le colis à l’entreprise.',
      };
    }
    return {
      id: 'business_handoff',
      label: 'Retourner à l’entreprise',
      detail: 'Remettez le colis à l’entreprise pour terminer la livraison.',
    };
  }

  if (delivery.status === 'started') {
    return {
      id: 'confirm_pickup',
      label: 'Confirmer la prise en charge',
      detail: 'Scannez ou sélectionnez manuellement le colis à l’entreprise.',
    };
  }
  if (delivery.status === 'scanned') {
    return {
      id: 'en_route_locker',
      label: 'Se rendre au casier',
      detail: 'Rendez-vous au casier puis confirmez le colis à déposer.',
    };
  }
  return {
    id: 'locker_deposit',
    label: 'Preuve de dépôt',
    detail: 'Photographiez le dépôt. Le terminal confirmera le casier une fois en service.',
  };
}

export function getDriverOrigin(delivery: DriverDeliveryLike): DriverPlace {
  const locker = delivery.parcel.locker;
  if (isCustomerReturnJob(delivery) || isHistoricalRts(delivery)) {
    return {
      role: 'Casier',
      action: 'Récupérer',
      name: locker ? `Casier Eveider ${locker.name}` : 'Casier',
      address: locker?.address ?? null,
      latitude: locker?.latitude ?? null,
      longitude: locker?.longitude ?? null,
    };
  }
  return {
    role: 'Entreprise',
    action: 'Collecte',
    name: delivery.parcel.senderLocationName?.trim() || delivery.parcel.businessName,
    address: delivery.parcel.senderAddress ?? null,
    latitude: delivery.parcel.senderLat ?? null,
    longitude: delivery.parcel.senderLng ?? null,
    contactName: delivery.parcel.senderName ?? null,
    contactPhone: delivery.parcel.senderPhone ?? null,
    instructions: delivery.parcel.senderInstructions ?? null,
  };
}

export function getDriverDestination(delivery: DriverDeliveryLike): DriverPlace {
  const locker = delivery.parcel.locker;
  if (isCustomerReturnJob(delivery) || isHistoricalRts(delivery)) {
    return {
      role: 'Entreprise',
      action: 'Retourner à',
      name: delivery.parcel.senderLocationName?.trim() || delivery.parcel.businessName,
      address: delivery.parcel.senderAddress ?? null,
      latitude: delivery.parcel.senderLat ?? null,
      longitude: delivery.parcel.senderLng ?? null,
      contactName: delivery.parcel.senderName ?? null,
      contactPhone: delivery.parcel.senderPhone ?? null,
      instructions: delivery.parcel.senderInstructions ?? null,
    };
  }
  return {
    role: 'Casier',
    action: 'Déposer',
    name: locker ? `Casier Eveider ${locker.name}` : 'Casier',
    address: locker?.address ?? null,
    latitude: locker?.latitude ?? null,
    longitude: locker?.longitude ?? null,
  };
}

export function getDriverCurrentStop(delivery: DriverDeliveryLike): DriverPlace {
  const step = getDriverDeliveryStep(delivery);
  if (
    step.id === 'awaiting_accept' ||
    step.id === 'ready_to_start' ||
    step.id === 'confirm_pickup' ||
    step.id === 'awaiting_business_pickup' ||
    step.id === 'awaiting_locker_pickup' ||
    step.id === 'historical_rts'
  ) {
    return getDriverOrigin(delivery);
  }
  return getDriverDestination(delivery);
}

export function getDriverPrimaryAction(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): { id: DriverPrimaryActionId; label: string } {
  if (!canDriverActOnDelivery(delivery)) {
    return { id: null, label: '' };
  }
  if (delivery.status === 'assigned') {
    return { id: 'accept_delivery', label: 'Maintenir pour accepter' };
  }
  if (delivery.status === 'accepted') {
    return { id: 'start_delivery', label: 'Maintenir pour commencer' };
  }
  if (delivery.status === 'started') {
    return { id: 'confirm_pickup', label: 'Confirmer la prise en charge' };
  }
  if (isCustomerReturnJob(delivery)) {
    return { id: 'confirm_business_handoff', label: 'Confirmer la remise' };
  }
  if (delivery.status === 'scanned') {
    return { id: 'confirm_deposit', label: 'Confirmer le dépôt' };
  }
  return { id: 'commissioning_deposit_proof', label: 'Photographier le dépôt' };
}

/** Short stop kind for queue cards: Collecte · place */
export function getDriverStopKindLabel(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): string {
  if (isHistoricalRts(delivery)) return 'Retour';
  if (isCustomerReturnJob(delivery)) {
    if (
      delivery.status === 'assigned' ||
      delivery.status === 'accepted' ||
      delivery.status === 'started'
    ) {
      return 'Collecte';
    }
    return 'Remise';
  }
  if (
    delivery.status === 'assigned' ||
    delivery.status === 'accepted' ||
    delivery.status === 'started'
  ) {
    return 'Collecte';
  }
  return 'Dépôt';
}

/** Dominant next-action line on the Livraisons card. */
export function getDriverParcelActionLabel(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): string {
  if (!isActiveDriverDelivery(delivery)) return '';
  if (delivery.status === 'assigned') return 'À accepter';
  if (delivery.status === 'accepted') return 'À démarrer';
  if (delivery.status === 'started') return '1 colis à confirmer';
  if (isCustomerReturnJob(delivery)) {
    return '1 colis à remettre';
  }
  if (delivery.status === 'scanned') return '1 colis à déposer';
  return '1 colis — preuve de dépôt';
}

export function getDriverStateLabel(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): string {
  if (isHistoricalRts(delivery)) return 'Lecture seule';
  if (delivery.status === 'assigned') return 'À accepter';
  if (delivery.status === 'accepted') return 'À démarrer';
  if (delivery.status === 'started') return 'En cours';
  if (delivery.status === 'scanned' || delivery.status === 'drop_off_pending') return 'En cours';
  if (delivery.status === 'completed') return 'Terminé';
  if (delivery.status === 'failed') return 'Incident';
  return getDriverDeliveryStep(delivery).label;
}

export function getDriverInstructions(delivery: DriverDeliveryLike): string | null {
  const fromDelivery = delivery.driverInstructions?.trim();
  if (fromDelivery) return fromDelivery;
  const fromOrigin = getDriverOrigin(delivery).instructions?.trim();
  return fromOrigin || null;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDeadlineClock(due: Date): string {
  return new Intl.DateTimeFormat('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(due);
}

/** Short clock for pickup/deposit confirmation footnotes. */
export function formatDriverClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDeadlineClock(date);
}

export function getDriverDeadlineDisplay(
  dueAt: string | null | undefined,
  now = new Date(),
): DriverDeadlineDisplay {
  if (!dueAt) return { kind: 'none', label: 'Sans échéance' };
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return { kind: 'none', label: 'Sans échéance' };

  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const clock = formatDeadlineClock(due);

  if (diffMs < 0) {
    return { kind: 'overdue', label: 'En retard', minutesUntil: diffMinutes };
  }

  const dueDay = startOfLocalDay(due).getTime();
  const today = startOfLocalDay(now).getTime();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowMs = tomorrow.getTime();

  if (dueDay === today) {
    if (diffMinutes <= 180) {
      return {
        kind: 'minutes',
        label: `Avant ${clock}`,
        minutesUntil: Math.max(diffMinutes, 1),
      };
    }
    return { kind: 'today', label: `Avant ${clock}`, minutesUntil: diffMinutes };
  }

  if (dueDay === tomorrowMs) {
    return { kind: 'tomorrow', label: `Demain · ${clock}`, minutesUntil: diffMinutes };
  }

  if (diffMinutes < 24 * 60) {
    return {
      kind: 'minutes',
      label: `Avant ${clock}`,
      minutesUntil: Math.max(diffMinutes, 1),
    };
  }

  return {
    kind: 'today',
    label: new Intl.DateTimeFormat('fr-CD', { day: '2-digit', month: 'short' }).format(due),
    minutesUntil: diffMinutes,
  };
}

/** Queue icon: package = collect, map-pin = deposit, rotate = return. */
export function getDriverTaskTypeIcon(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): 'package' | 'map-pin' | 'rotate-ccw' {
  if (isHistoricalRts(delivery)) return 'rotate-ccw';
  if (isCustomerReturnJob(delivery)) {
    if (
      delivery.status === 'assigned' ||
      delivery.status === 'accepted' ||
      delivery.status === 'started'
    ) {
      return 'package';
    }
    return 'rotate-ccw';
  }
  if (
    delivery.status === 'assigned' ||
    delivery.status === 'accepted' ||
    delivery.status === 'started'
  ) {
    return 'package';
  }
  return 'map-pin';
}

/** Shorten “Casier Eveider KAM” → “Eveider KAM” for dense queue rows. */
export function shortDriverPlaceName(name: string): string {
  return name.replace(/^Casier\s+/i, '').trim() || name;
}

/** Sort overdue → nearest deadline → no deadline. Stable by createdAt. */
export function sortDeliveriesByDeadline<T extends Pick<DriverDeliveryLike, 'dueAt' | 'createdAt'>>(
  items: T[],
  now = new Date(),
): T[] {
  const nowMs = now.getTime();
  return [...items].sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : null;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : null;
    const aValid = aDue != null && !Number.isNaN(aDue);
    const bValid = bDue != null && !Number.isNaN(bDue);

    if (!aValid && !bValid) {
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    }
    if (!aValid) return 1;
    if (!bValid) return -1;

    const aOverdue = aDue! < nowMs;
    const bOverdue = bDue! < nowMs;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (aDue !== bDue) return aDue! - bDue!;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });
}

export function isDeliveryDueToday(
  delivery: Pick<DriverDeliveryLike, 'dueAt'>,
  now = new Date(),
): boolean {
  if (!delivery.dueAt) return true;
  const due = new Date(delivery.dueAt);
  if (Number.isNaN(due.getTime())) return true;
  if (due.getTime() < now.getTime()) return true;
  return startOfLocalDay(due).getTime() === startOfLocalDay(now).getTime();
}

export function getDriverCallLabel(place: DriverPlace): string {
  if (place.role === 'Entreprise' && place.action === 'Collecte') {
    return 'Appeler le contact de collecte';
  }
  if (place.role === 'Entreprise') {
    return 'Appeler le contact entreprise';
  }
  return 'Appeler';
}

export function getDriverInstructionsTitle(place: DriverPlace): string {
  if (place.role === 'Entreprise' && place.action === 'Collecte') {
    return 'Instructions de collecte';
  }
  if (place.role === 'Entreprise') {
    return 'Instructions de remise';
  }
  return 'Instructions';
}

/** Validate a scanned code against this delivery's parcel (pickup or locker). */
export function matchesDriverParcelCode(delivery: DriverDeliveryLike, code: string): boolean {
  const value = code.trim().toUpperCase();
  if (!value) return false;
  const tracking = (delivery.parcel.trackingNumber ?? '').trim().toUpperCase();
  const reference = (delivery.parcel.reference ?? '').trim().toUpperCase();
  return value === tracking || (Boolean(reference) && value === reference);
}

/** Contextual exception reasons for Signaler un problème. */
export function getDriverIssueReasons(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
): DriverIssueReason[] {
  if (!canDriverActOnDelivery(delivery)) return [];

  if (
    delivery.status === 'assigned' ||
    delivery.status === 'accepted' ||
    delivery.status === 'started'
  ) {
    if (isCustomerReturnJob(delivery)) {
      return [
        { id: 'locker_unavailable', label: 'Casier indisponible', type: 'locker_unavailable' },
        { id: 'compartment', label: 'Compartiment ne s’ouvre pas', type: 'locker_system' },
        { id: 'parcel_missing', label: 'Colis introuvable', type: 'parcel_problem' },
        { id: 'wrong_parcel', label: 'Mauvais colis scanné', type: 'parcel_problem' },
        { id: 'damaged', label: 'Colis endommagé', type: 'parcel_problem' },
        { id: 'network', label: 'Réseau indisponible', type: 'failed_delivery' },
      ];
    }
    return [
      { id: 'business_closed', label: 'Entreprise fermée / indisponible', type: 'failed_delivery' },
      { id: 'parcel_missing', label: 'Colis introuvable', type: 'parcel_problem' },
      { id: 'wrong_parcel', label: 'Mauvais colis scanné', type: 'parcel_problem' },
      { id: 'damaged', label: 'Colis endommagé', type: 'parcel_problem' },
      { id: 'access', label: 'Accès au point de collecte impossible', type: 'failed_delivery' },
      { id: 'network', label: 'Réseau indisponible', type: 'failed_delivery' },
    ];
  }

  return [
    { id: 'locker_unavailable', label: 'Casier indisponible', type: 'locker_unavailable' },
    { id: 'compartment', label: 'Compartiment ne s’ouvre pas', type: 'locker_system' },
    { id: 'does_not_fit', label: 'Le colis ne rentre pas', type: 'parcel_problem' },
    { id: 'damaged', label: 'Colis endommagé', type: 'parcel_problem' },
    { id: 'wrong_parcel', label: 'Mauvais colis scanné', type: 'parcel_problem' },
    { id: 'network', label: 'Réseau indisponible', type: 'failed_delivery' },
  ];
}

function routeStopKey(
  kind: 'collect' | 'deposit',
  place: DriverPlace,
): string {
  if (place.latitude != null && place.longitude != null) {
    return `${kind}:${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`;
  }
  return `${kind}:${place.name}:${place.address ?? ''}`;
}

/**
 * Remaining route legs for assigned work: collect (if still needed) + deposit/remise.
 * Legs at the same place are aggregated for a day-route view.
 */
export function buildDriverRouteLegs(deliveries: DriverDeliveryLike[]): DriverRouteLeg[] {
  const buckets = new Map<string, DriverRouteLeg>();

  for (const delivery of deliveries) {
    if (!isActiveDriverDelivery(delivery) || isHistoricalRts(delivery)) continue;

    const legs: Array<{ kind: 'collect' | 'deposit'; place: DriverPlace }> = [];
    if (
      delivery.status === 'assigned' ||
      delivery.status === 'accepted' ||
      delivery.status === 'started'
    ) {
      legs.push({ kind: 'collect', place: getDriverOrigin(delivery) });
    }
    if (
      delivery.status === 'assigned' ||
      delivery.status === 'accepted' ||
      delivery.status === 'started' ||
      delivery.status === 'scanned' ||
      delivery.status === 'drop_off_pending'
    ) {
      legs.push({ kind: 'deposit', place: getDriverDestination(delivery) });
    }

    for (const leg of legs) {
      const id = routeStopKey(leg.kind, leg.place);
      const existing = buckets.get(id);
      const dueAt = delivery.dueAt ?? null;
      if (existing) {
        existing.deliveryIds.push(delivery.id);
        existing.parcelCount += 1;
        existing.actionLabel =
          leg.kind === 'collect'
            ? `${existing.parcelCount} colis à récupérer`
            : isCustomerReturnJob(delivery)
              ? `Remettre ${existing.parcelCount} colis`
              : `Déposer ${existing.parcelCount} colis`;
        if (dueAt) {
          if (!existing.dueAt || dueAt < existing.dueAt) existing.dueAt = dueAt;
        }
        continue;
      }
      buckets.set(id, {
        id,
        deliveryIds: [delivery.id],
        kind: leg.kind,
        kindLabel: leg.kind === 'collect' ? 'Collecte' : isCustomerReturnJob(delivery) ? 'Remise' : 'Dépôt',
        name: leg.place.name,
        address: leg.place.address ?? '',
        latitude: leg.place.latitude,
        longitude: leg.place.longitude,
        parcelCount: 1,
        dueAt,
        actionLabel:
          leg.kind === 'collect'
            ? '1 colis à récupérer'
            : isCustomerReturnJob(delivery)
              ? 'Remettre 1 colis'
              : 'Déposer 1 colis',
      });
    }
  }

  return Array.from(buckets.values());
}

export function summarizeDriverRoute(legs: DriverRouteLeg[]): {
  stopCount: number;
  parcelCount: number;
} {
  const parcelIds = new Set<string>();
  for (const leg of legs) {
    for (const id of leg.deliveryIds) parcelIds.add(id);
  }
  return { stopCount: legs.length, parcelCount: parcelIds.size };
}

export function getDriverSuccessCopy(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind'>,
  action: 'scan' | 'arrive' | 'deposit' | 'handoff',
): { title: string; detail: string } {
  if (action === 'scan' && isCustomerReturnJob(delivery)) {
    return {
      title: 'Retour récupéré',
      detail: 'Ramenez maintenant le colis à l’entreprise.',
    };
  }
  if (action === 'scan') {
    return {
      title: 'Colis récupéré',
      detail: 'Prochaine étape : se rendre au casier, puis scanner le colis pour le dépôt.',
    };
  }
  if (action === 'handoff') {
    return {
      title: 'Retour remis à l’entreprise',
      detail: 'Cette livraison est terminée.',
    };
  }
  if (action === 'deposit') {
    return {
      title: 'Dépôt confirmé',
      detail: 'Cette livraison est terminée.',
    };
  }
  return {
    title: 'Colis validé au casier',
    detail: 'Photographiez maintenant la preuve de dépôt.',
  };
}

export function getDriverPackageSizeLabel(size?: string | null): string | null {
  if (!size) return null;
  if (size in PACKAGE_SIZE_LABELS) {
    return PACKAGE_SIZE_LABELS[size as PackageSize];
  }
  return size;
}

export function getDriverTrackingLabel(delivery: DriverDeliveryLike): string {
  return delivery.parcel.trackingNumber || delivery.parcel.reference || 'Suivi indisponible';
}

export type DriverRecordTone = 'success' | 'danger' | 'muted';

export type DriverRecordSummary = {
  title: string;
  subtitle: string;
  tone: DriverRecordTone;
  icon: 'check' | 'rotate-ccw' | 'alert-circle';
};

/** Compact header copy for completed / exception detail records. */
export function getDriverRecordSummary(
  delivery: Pick<DriverDeliveryLike, 'status' | 'kind' | 'completedAt' | 'updatedAt' | 'dueAt'>,
): DriverRecordSummary {
  if (isHistoricalRts(delivery)) {
    return {
      title: 'Retour non retiré',
      subtitle: 'Aucun retrait effectué',
      tone: 'danger',
      icon: 'rotate-ccw',
    };
  }

  if (delivery.status === 'failed') {
    return {
      title: 'Incident',
      subtitle: 'Cette livraison n’a pas pu être terminée',
      tone: 'danger',
      icon: 'alert-circle',
    };
  }

  const when = formatDriverCompletedStamp(delivery.completedAt ?? delivery.updatedAt);
  const planned = delivery.dueAt ? formatDriverPlannedStamp(delivery.dueAt) : null;
  const subtitle = planned ? `${when} · ${planned}` : when;

  if (isCustomerReturnJob(delivery)) {
    return {
      title: 'Retour remis',
      subtitle,
      tone: 'success',
      icon: 'check',
    };
  }

  return {
    title: 'Dépôt confirmé',
    subtitle,
    tone: 'success',
    icon: 'check',
  };
}

export function formatDriverCompletedStamp(iso: string | null | undefined): string {
  if (!iso) return 'Horodatage indisponible';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Horodatage indisponible';
  return new Intl.DateTimeFormat('fr-CD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', ' ·');
}

export function formatDriverPlannedStamp(dueAt: string): string | null {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const clock = new Intl.DateTimeFormat('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(due);
  return `prévu avant ${clock}`;
}

export type DriverRouteTrailStop = {
  id: string;
  label: string;
  name: string;
  address?: string | null;
  meta?: string | null;
  reached: boolean;
};

/** Origin → destination stops for history/record detail (not the 5-step workflow). */
export function getDriverRecordRouteStops(
  delivery: DriverDeliveryLike,
): { title: string; stops: DriverRouteTrailStop[]; footnote?: string } {
  const origin = getDriverOrigin(delivery);
  const destination = getDriverDestination(delivery);
  const compartment =
    delivery.parcel.compartmentLabel != null
      ? `Compartiment ${delivery.parcel.compartmentLabel}`
      : null;

  if (isHistoricalRts(delivery)) {
    return {
      title: 'Parcours du retour',
      footnote: 'Retour non effectué. Cette tâche est désormais en lecture seule.',
      stops: [
        {
          id: 'recover',
          label: 'À récupérer',
          name: origin.name,
          address: origin.address,
          meta: compartment,
          reached: true,
        },
        {
          id: 'return',
          label: 'Retour entreprise',
          name: destination.name,
          address: destination.address,
          reached: false,
        },
      ],
    };
  }

  if (isCustomerReturnJob(delivery)) {
    const completed = delivery.status === 'completed';
    return {
      title: 'Parcours du retour',
      stops: [
        {
          id: 'collect',
          label: 'Collecte',
          name: origin.name,
          address: origin.address,
          meta: compartment,
          reached: completed || delivery.status === 'scanned' || delivery.status === 'drop_off_pending',
        },
        {
          id: 'handoff',
          label: 'Remise',
          name: destination.name,
          address: destination.address,
          reached: completed,
        },
      ],
    };
  }

  const completed = delivery.status === 'completed';
  const failedEarly = delivery.status === 'failed' && !delivery.scannedAt;
  return {
    title: 'Parcours',
    stops: [
      {
        id: 'collect',
        label: 'Collecte',
        name: origin.name,
        address: origin.address,
        reached: !failedEarly,
      },
      {
        id: 'deposit',
        label: 'Dépôt',
        name: destination.name,
        address: destination.address,
        meta: compartment,
        reached: completed,
      },
    ],
  };
}

/** Fail closed: keep the previous delivery when the backend/network rejects the action. */
export function applyDriverMutationResult<T extends { delivery: DriverDeliveryLike }>(
  previous: DriverDeliveryLike,
  result: DriverActionResult<T>,
): { delivery: DriverDeliveryLike; error: string | null; succeeded: boolean } {
  if (!result.success) {
    return { delivery: previous, error: translateDriverError(result.error), succeeded: false };
  }
  return { delivery: result.data.delivery, error: null, succeeded: true };
}

export function translateDriverError(message: string): string {
  const value = message.trim();
  if (!value) return 'Action impossible pour le moment. Réessayez.';
  const lower = value.toLowerCase();
  if (lower.includes('non authentifié') || lower.includes('session')) {
    return 'Session expirée. Reconnectez-vous, puis réessayez.';
  }
  if (
    lower.includes('network') ||
    lower.includes('inaccessible') ||
    lower.includes('délai') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch')
  ) {
    return 'Réseau indisponible. L’action n’a pas été enregistrée. Réessayez.';
  }
  if (lower.includes('incorrecte') || lower.includes('suivi')) {
    return 'Numéro de suivi incorrect. Vérifiez le colis, puis réessayez.';
  }
  if (lower.includes('pas en attente de scan') || lower.includes('déjà')) {
    return 'Cette étape est déjà faite. Rechargez la livraison.';
  }
  if (lower.includes('assign')) {
    return 'Cette livraison n’est pas assignée à votre compte.';
  }
  if (lower.includes('casier indisponible') || lower.includes('casier de destination')) {
    return 'Casier indisponible pour cette livraison. Contactez le dispatch.';
  }
  if (lower.includes('autorisée') || lower.includes('non autoris')) {
    return 'Action impossible à cette étape. Rechargez, puis suivez l’étape affichée.';
  }
  if (lower.includes('select') || lower.includes('sql') || lower.includes('null value')) {
    return 'Action impossible pour le moment. Réessayez.';
  }
  return value;
}

export const DRIVER_FORBIDDEN_UI_COPY = [
  'Ouvrir le compartiment',
  'Ouvrir le casier',
  'Choisir un compartiment',
  'Sélectionner un compartiment',
  'Node-RED',
  'PLC',
  'PawaPay',
  'Code de retrait',
  'PIN destinataire',
  'Marquer en transit',
  'Marquer livré',
  'Changer le statut',
  'Passer à l’étape suivante',
] as const;
