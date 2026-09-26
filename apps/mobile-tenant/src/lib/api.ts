import { type DeliveryKind, type DeliveryStatus, type IssueStatus, type IssueType, type ParcelReturnMethod, type ParcelReturnStatus, type ParcelStatus, type ShipmentPickupType, type UserRole } from '@eveider/domain';
import { apiFetch } from './api-fetch';
import { authApiUrl, supabase } from './supabase';

export type PickupPaymentStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

export type PickupPayment = {
  required: boolean;
  status: PickupPaymentStatus;
  amount: string | null;
  currency: string | null;
  provider: string | null;
  depositId: string | null;
  failureReason: string | null;
  kind?: string | null;
  purpose?: string | null;
  integrityError?: 'CANONICAL_CHARGE_MISSING' | null;
  paymentProviderAvailable?: boolean;
};

export type PaymentProvider = {
  id: string;
  label: string;
};

export type CustomerReturn = {
  id: string;
  status: ParcelReturnStatus;
  statusLabel: string;
  method: ParcelReturnMethod | null;
  methodLabel: string | null;
  returnLocker: { id: string; name: string; address: string } | null;
  returnCode: string | null;
  canCancel: boolean;
  canDeposit: boolean;
};

export type CustomerParcel = {
  id: string;
  trackingNumber: string;
  reference: string | null;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  businessName: string;
  pickupType: ShipmentPickupType;
  locker: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  compartmentLabel: string | null;
  pickupPin: string | null;
  pickupPayment: PickupPayment | null;
  deliveryStatus: DeliveryStatus | null;
  canRequestReturn?: boolean;
  customerReturn?: CustomerReturn | null;
  createdAt: string;
  updatedAt: string;
};

export type CourierLockerStatus = 'active' | 'offline' | 'full' | 'archived';

export type CourierDelivery = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  kind?: DeliveryKind;
  kindLabel?: string;
  scannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasDropOffPhoto: boolean;
  dueAt?: string | null;
  driverInstructions?: string | null;
  parcel: {
    id: string;
    trackingNumber: string;
    reference: string | null;
    status: string;
    recipientName: string | null;
    businessName: string;
    senderName?: string | null;
    senderPhone?: string | null;
    senderAddress?: string | null;
    senderLocationName?: string | null;
    senderLat?: number | null;
    senderLng?: number | null;
    senderInstructions?: string | null;
    packageSize?: string | null;
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      status: CourierLockerStatus;
      statusLabel: string;
      canAcceptDropOff: boolean;
    } | null;
    compartmentId: string | null;
    compartmentLabel: string | null;
  };
};

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function customerFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Non authentifié' };
  }

  const { timeoutMs, ...fetchOptions } = options ?? {};

  return apiFetch<T>(path, {
    ...fetchOptions,
    timeoutMs: timeoutMs ?? (fetchOptions.method === 'POST' ? 45_000 : 12_000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...fetchOptions.headers,
    },
  });
}

async function courierFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Non authentifié' };
  }

  const { timeoutMs, ...fetchOptions } = options ?? {};

  return apiFetch<T>(path, {
    ...fetchOptions,
    timeoutMs: timeoutMs ?? (fetchOptions.method === 'POST' ? 45_000 : 12_000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...fetchOptions.headers,
    },
  });
}

export type CustomerLocker = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: 'SMART_LOCKER' | 'PARTNER_POINT' | 'RESIDENTIAL_LOCKER';
  typeLabel?: string;
  availableCompartments: number;
  availableSlots?: number;
  contactPhone?: string | null;
  distanceKm?: number;
};

export async function fetchCustomerLockers(latitude: number, longitude: number) {
  return customerFetch<{ lockers: CustomerLocker[] }>(
    `/api/customer/lockers?latitude=${latitude}&longitude=${longitude}`,
  );
}

function mapPublicLocker(raw: CustomerLocker): CustomerLocker {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    latitude: raw.latitude,
    longitude: raw.longitude,
    type: raw.type,
    typeLabel: raw.typeLabel,
    availableCompartments: raw.availableCompartments,
    availableSlots: raw.availableSlots ?? raw.availableCompartments,
    contactPhone: raw.contactPhone ?? null,
    distanceKm: raw.distanceKm,
  };
}

export type ActiveCity = {
  id: string;
  name: string;
};

export async function fetchActiveCities() {
  return apiFetch<{ cities: ActiveCity[] }>('/api/cities/active');
}

export async function fetchLockersByCity(city: string) {
  const result = await apiFetch<{ lockers: CustomerLocker[] }>(
    `/api/lockers/by-city?city=${encodeURIComponent(city)}`,
  );
  if (!result.success) return result;

  return {
    success: true as const,
    data: { lockers: result.data.lockers.map(mapPublicLocker) },
  };
}

export type MapPlaceResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  placeType: string;
  placeTypeLabel: string;
};

export async function searchMapPlaces(
  query: string,
  options?: { latitude?: number; longitude?: number; limit?: number },
) {
  const params = new URLSearchParams({ q: query.trim() });
  if (options?.latitude != null) params.set('latitude', String(options.latitude));
  if (options?.longitude != null) params.set('longitude', String(options.longitude));
  if (options?.limit != null) params.set('limit', String(options.limit));
  return apiFetch<{ places: MapPlaceResult[] }>(`/api/maps/places?${params.toString()}`);
}

export async function reverseGeocodeMap(latitude: number, longitude: number) {
  return apiFetch<{ address: string | null }>('/api/maps/reverse-geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function fetchPublicLockers(latitude: number, longitude: number) {
  const result = await apiFetch<{ lockers: CustomerLocker[] }>(
    `/api/lockers/nearest?latitude=${latitude}&longitude=${longitude}&limit=20`,
  );
  if (!result.success) return result;
  return {
    success: true as const,
    data: { lockers: result.data.lockers.map(mapPublicLocker) },
  };
}

export async function trackParcelByNumber(trackingNumber: string) {
  return apiFetch<{ trackToken?: string; parcel?: CustomerParcel }>(
    '/api/track',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'tracking', trackingNumber }),
    },
  );
}

export async function assignCustomerParcelLocker(parcelId: string, lockerId: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${parcelId}/locker`, {
    method: 'PATCH',
    body: JSON.stringify({ lockerId }),
  });
}

export async function markCustomerParcelCollected(parcelId: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${parcelId}/collect`, {
    method: 'POST',
  });
}

export async function requestCustomerReturn(parcelId: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${parcelId}/return`, {
    method: 'POST',
  });
}

export async function cancelCustomerReturn(parcelId: string) {
  return customerFetch<{ parcel: CustomerParcel }>(
    `/api/customer/parcels/${parcelId}/return/cancel`,
    { method: 'POST' },
  );
}

export async function confirmCustomerReturnDeposit(
  parcelId: string,
  input: { lockerId: string; returnCode: string },
) {
  return customerFetch<{ parcel: CustomerParcel }>(
    `/api/customer/parcels/${parcelId}/return/deposit`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}


export async function fetchCustomerParcels() {
  return customerFetch<{ parcels: CustomerParcel[] }>('/api/customer/parcels');
}

export async function fetchCustomerParcel(id: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${id}`);
}

export async function fetchPickupPaymentProviders() {
  return customerFetch<{
    amount: string;
    currency: string;
    country: string;
    providers: PaymentProvider[];
  }>('/api/payments/pawapay/providers');
}

export async function fetchPickupPaymentStatus(parcelId: string) {
  return customerFetch<{ payment: PickupPayment; parcel: CustomerParcel }>(
    `/api/customer/parcels/${parcelId}/payment`,
  );
}

export async function initiatePickupPayment(
  parcelId: string,
  input: { provider: string; phoneNumber?: string },
) {
  return customerFetch<{
    pawapayStatus: string;
    payment: PickupPayment;
    parcel: CustomerParcel;
  }>(`/api/customer/parcels/${parcelId}/payment`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type UserProfile = {
  authId: string;
  email: string | null;
  phone: string | null;
  profile: {
    id: string;
    role: UserRole;
    fullName: string | null;
    email: string | null;
    businessId: string | null;
  };
};

export async function fetchProfile() {
  return customerFetch<UserProfile>('/api/auth/me');
}

export async function updateAccountProfile(input: { fullName: string; phone?: string }) {
  return customerFetch<{ fullName: string | null; phone: string | null }>('/api/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

function mapPasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Mot de passe actuel incorrect';
  }
  if (lower.includes('same password') || lower.includes('different from the old')) {
    return 'Le nouveau mot de passe doit être différent de l’actuel';
  }
  if (lower.includes('weak') || lower.includes('least')) {
    return 'Le mot de passe doit contenir au moins 8 caractères';
  }
  return message || 'Impossible de modifier le mot de passe';
}

export async function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResult<{ updated: true }>> {
  if (input.newPassword !== input.confirmPassword) {
    return { success: false, error: 'Les mots de passe ne correspondent pas' };
  }
  if (input.newPassword.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  if (input.newPassword === input.currentPassword) {
    return { success: false, error: 'Le nouveau mot de passe doit être différent de l’actuel' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim();
  if (!email) {
    return { success: false, error: 'Aucun e-mail de connexion associé à ce compte' };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: input.currentPassword,
  });
  if (reauthError) {
    return { success: false, error: mapPasswordError(reauthError.message) };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: input.newPassword });
  if (updateError) {
    return { success: false, error: mapPasswordError(updateError.message) };
  }

  return { success: true, data: { updated: true } };
}

export type CourierHistorySummary = {
  days: number;
  completed: number;
  failed: number;
  successRate: number;
};

export type CourierDriverDocumentStatus =
  | 'verified'
  | 'pending'
  | 'needs_correction'
  | 'missing';

export type CourierDriverProfile = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  driverCode: string;
  dossierId: string;
  accountStatus: string;
  accountStatusLabel: string;
  operationalStatus: string;
  operationalStatusLabel: string;
  organization: {
    id: string;
    name: string;
    isPlatformOrg: boolean;
  } | null;
  contractorType: string;
  isAcceptingWork: boolean;
  selfAssignmentEnabled?: boolean;
  profilePhotoUrl?: string | null;
  vehicle?: {
    type: string | null;
    makeModel: string | null;
    plate: string | null;
    color: string | null;
  } | null;
  documents: Array<{
    key: 'identity';
    status: CourierDriverDocumentStatus;
  }>;
};

export type CourierClaimableParcel = {
  parcelId: string;
  kind: DeliveryKind;
  trackingNumber: string;
  reference: string | null;
  businessName: string;
  senderAddress: string | null;
  lockerName: string | null;
  lockerAddress: string | null;
  dueAt: string | null;
  driverInstructions: string | null;
};

export async function fetchCourierDriverProfile() {
  return courierFetch<CourierDriverProfile>('/api/driver/profile');
}

export async function updateCourierDriverProfile(input: {
  vehicleType?: string | null;
  vehicleMakeModel?: string | null;
  vehiclePlate?: string | null;
  vehicleColor?: string | null;
}) {
  return courierFetch<{
    vehicle: {
      type: string | null;
      makeModel: string | null;
      plate: string | null;
      color: string | null;
    };
  }>('/api/driver/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function uploadCourierDriverPhoto(photoBase64: string) {
  return courierFetch<{ hasProfilePhoto: boolean }>('/api/driver/profile/photo', {
    method: 'POST',
    body: JSON.stringify({ photoBase64 }),
    timeoutMs: 60_000,
  });
}

export async function deleteCourierDriverPhoto() {
  return courierFetch<{ hasProfilePhoto: boolean }>('/api/driver/profile/photo', {
    method: 'DELETE',
  });
}

/** Fetch profile photo bytes as a data URL (auth required). */
export async function fetchCourierDriverPhotoDataUrl(): Promise<ApiResult<string>> {
  const token = await getAccessToken();
  if (!token) return { success: false, error: 'Non authentifié' };
  try {
    const res = await fetch(`${authApiUrl}/api/driver/profile/photo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { success: false, error: 'Photo introuvable' };
    }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Lecture photo impossible'));
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return { success: false, error: 'Photo introuvable' };
    return { success: true, data: dataUrl };
  } catch {
    return { success: false, error: 'Photo introuvable' };
  }
}

export async function updateCourierAvailability(isAcceptingWork: boolean) {
  return courierFetch<{ isAcceptingWork: boolean }>('/api/driver/availability', {
    method: 'PATCH',
    body: JSON.stringify({ isAcceptingWork }),
  });
}

export async function fetchCourierDeliveries() {
  return courierFetch<{ deliveries: CourierDelivery[]; summary: CourierHistorySummary }>(
    '/api/driver/deliveries',
  );
}

export async function fetchCourierAvailableDeliveries() {
  return courierFetch<{
    selfAssignmentEnabled: boolean;
    parcels: CourierClaimableParcel[];
  }>('/api/driver/deliveries/available');
}

export async function claimCourierDelivery(input: {
  parcelId: string;
  kind?: DeliveryKind;
}) {
  return courierFetch<{ delivery: CourierDelivery }>('/api/driver/deliveries/claim', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function acceptCourierDelivery(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function startCourierDelivery(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function confirmCourierPickup(
  id: string,
  input: { mode: 'scan'; reference: string } | { mode: 'manual' },
) {
  return courierFetch<{ delivery: CourierDelivery }>(
    `/api/driver/deliveries/${id}/confirm-pickup`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function fetchCourierDelivery(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}`);
}

export async function scanCourierDelivery(id: string, reference: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}/scan`, {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
}

export async function startCourierDropOff(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}/drop-off`, {
    method: 'POST',
  });
}

export async function completeCourierDropOff(
  id: string,
  input: { compartmentId?: string; photoBase64: string },
) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/driver/deliveries/${id}/complete`, {
    method: 'POST',
    timeoutMs: 60_000,
    body: JSON.stringify(input),
  });
}

export async function completeCourierReturnToBusiness(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(
    `/api/driver/deliveries/${id}/complete-to-business`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function fetchCourierDropOffProof(id: string) {
  return courierFetch<{ photo: string }>(`/api/driver/deliveries/${id}/proof`);
}

export type ReportedIssue = {
  id: string;
  type: IssueType;
  typeLabel: string;
  status: IssueStatus;
  statusLabel: string;
  description: string | null;
  parcelId: string | null;
  parcelReference: string | null;
  lockerId: string | null;
  lockerName: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateIssueInput = {
  type: IssueType;
  parcelId?: string;
  lockerId?: string;
  description: string;
};

export async function reportCustomerIssue(input: CreateIssueInput) {
  return customerFetch<{ issue: ReportedIssue }>('/api/customer/issues', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function reportCourierIssue(input: CreateIssueInput) {
  return courierFetch<{ issue: ReportedIssue }>('/api/driver/issues', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchCustomerIssues() {
  return customerFetch<{ issues: ReportedIssue[] }>('/api/customer/issues');
}

export async function fetchCourierIssues() {
  return courierFetch<{ issues: ReportedIssue[] }>('/api/driver/issues');
}

export type CustomerNotification = {
  id: string;
  type: string | null;
  title: string | null;
  message: string;
  read: boolean;
  parcelId: string | null;
  parcelReference: string | null;
  parcelTrackingNumber: string | null;
  entityType: string | null;
  entityId: string | null;
  deliveryId: string | null;
  createdAt: string;
};

export async function fetchCustomerNotifications() {
  return customerFetch<{ notifications: CustomerNotification[]; unreadCount: number }>(
    '/api/customer/notifications',
  );
}

export async function markCustomerNotificationRead(id: string) {
  return customerFetch<{ notification: CustomerNotification }>(
    `/api/customer/notifications/${id}/read`,
    { method: 'PATCH' },
  );
}

export async function markCustomerNotificationsReadAll() {
  return customerFetch<{ updated: number }>('/api/customer/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function fetchCourierNotifications() {
  return courierFetch<{ notifications: CustomerNotification[]; unreadCount: number }>(
    '/api/driver/notifications',
  );
}

export async function markCourierNotificationRead(id: string) {
  return courierFetch<{ notification: CustomerNotification }>(
    `/api/driver/notifications/${id}/read`,
    { method: 'PATCH' },
  );
}

export async function markCourierNotificationsReadAll() {
  return courierFetch<{ updated: number }>('/api/driver/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function registerPushDevice(input: {
  expoPushToken: string;
  platform: 'ios' | 'android';
  deviceId?: string | null;
}) {
  return customerFetch<{
    device: { id: string; platform: string; enabled: boolean; lastSeenAt: string };
  }>('/api/mobile/push-devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unregisterPushDevice(input?: {
  expoPushToken?: string | null;
  deviceId?: string | null;
}) {
  return customerFetch<{ updated: number }>('/api/mobile/push-devices', {
    method: 'DELETE',
    body: JSON.stringify(input ?? {}),
  });
}

export async function fetchPushNotificationPreference() {
  return customerFetch<{ pushNotificationsEnabled: boolean }>(
    '/api/mobile/notification-preferences',
  );
}

export async function setPushNotificationPreference(enabled: boolean) {
  return customerFetch<{ pushNotificationsEnabled: boolean }>(
    '/api/mobile/notification-preferences',
    {
      method: 'PATCH',
      body: JSON.stringify({ pushNotificationsEnabled: enabled }),
    },
  );
}

export async function deleteCustomerAccount() {
  return customerFetch<{ deleted: boolean }>('/api/account/delete', { method: 'POST' });
}

export async function deactivateCourierAccount() {
  return courierFetch<{ deactivated: boolean }>('/api/account/deactivate', { method: 'POST' });
}
