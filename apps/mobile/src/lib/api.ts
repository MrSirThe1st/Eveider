import type { DeliveryStatus, IssueStatus, IssueType, ParcelStatus, UserRole } from '@eveider/domain';
import { apiFetch } from './api-fetch';
import { supabase } from './supabase';

export type CustomerParcel = {
  id: string;
  reference: string;
  status: ParcelStatus;
  statusLabel: string;
  recipientName: string | null;
  businessName: string;
  locker: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  compartmentLabel: string | null;
  pickupPin: string | null;
  deliveryStatus: DeliveryStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type CourierDelivery = {
  id: string;
  status: DeliveryStatus;
  statusLabel: string;
  scannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parcel: {
    id: string;
    reference: string;
    status: string;
    recipientName: string | null;
    businessName: string;
    locker: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
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
  options?: RequestInit,
): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Non authentifié' };
  }

  return apiFetch<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
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
  availableCompartments: number;
  distanceKm?: number;
};

export async function fetchCustomerLockers(latitude: number, longitude: number) {
  return customerFetch<{ lockers: CustomerLocker[] }>(
    `/api/customer/lockers?latitude=${latitude}&longitude=${longitude}`,
  );
}

export async function assignCustomerParcelLocker(parcelId: string, lockerId: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${parcelId}/locker`, {
    method: 'PATCH',
    body: JSON.stringify({ lockerId }),
  });
}

export async function fetchCustomerParcels() {
  return customerFetch<{ parcels: CustomerParcel[] }>('/api/customer/parcels');
}

export async function fetchCustomerParcel(id: string) {
  return customerFetch<{ parcel: CustomerParcel }>(`/api/customer/parcels/${id}`);
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

export async function fetchCourierDeliveries() {
  return courierFetch<{ deliveries: CourierDelivery[] }>('/api/courier/deliveries');
}

export async function fetchCourierDelivery(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/courier/deliveries/${id}`);
}

export async function scanCourierDelivery(id: string, reference: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/courier/deliveries/${id}/scan`, {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
}

export async function startCourierDropOff(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/courier/deliveries/${id}/drop-off`, {
    method: 'POST',
  });
}

export async function completeCourierDropOff(id: string) {
  return courierFetch<{ delivery: CourierDelivery }>(`/api/courier/deliveries/${id}/complete`, {
    method: 'POST',
  });
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
  return courierFetch<{ issue: ReportedIssue }>('/api/courier/issues', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchCustomerIssues() {
  return customerFetch<{ issues: ReportedIssue[] }>('/api/customer/issues');
}

export async function fetchCourierIssues() {
  return courierFetch<{ issues: ReportedIssue[] }>('/api/courier/issues');
}

export type CustomerNotification = {
  id: string;
  message: string;
  read: boolean;
  parcelId: string | null;
  parcelReference: string | null;
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
