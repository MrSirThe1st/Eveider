import type { IssueType, ParcelStatus } from '@eveider/domain';

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
  dailyParcelsCreated: { date: string; count: number }[];
  parcelsByStatus: { status: ParcelStatus; count: number }[];
  openIssuesByType: { type: IssueType; count: number }[];
  topLockers: { lockerId: string; lockerName: string; parcelCount: number }[];
  topBusinesses: { businessId: string; businessName: string; parcelCount: number }[];
};

export type DashboardParcelItem = {
  id: string;
  trackingNumber: string;
  reference: string | null;
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
};

export const DASHBOARD_DAY_OPTIONS = [7, 14, 30] as const;
export type DashboardDayRange = (typeof DASHBOARD_DAY_OPTIONS)[number];
