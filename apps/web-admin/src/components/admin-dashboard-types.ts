import type { ParcelStatus } from '@eveider/domain';

export type DashboardStats = {
  parcelsToday: number;
  activeDeliveries: number;
  completedToday: number;
  readyForPickup: number;
  openIssues: number;
  lockerOccupancy: {
    occupied: number;
    total: number;
    available: number;
  };
};

export type AnalyticsReport = {
  pickupSuccessRate: number;
  lockerUsageRate: number;
  collected: number;
  awaitingPickup: number;
  dailyDeliveries: { date: string; count: number }[];
  topLockers: { lockerId: string; lockerName: string; parcelCount: number }[];
  topBusinesses: { businessId: string; businessName: string; parcelCount: number }[];
};

export type DashboardParcelItem = {
  id: string;
  reference: string;
  status: ParcelStatus;
  recipientName: string | null;
  recipientPhone: string;
  business: { id: string; name: string };
  locker: { name: string; address: string } | null;
  createdAt: string;
};

export type AdminDashboardData = {
  stats: DashboardStats;
  analytics: AnalyticsReport;
  parcels: DashboardParcelItem[];
};
