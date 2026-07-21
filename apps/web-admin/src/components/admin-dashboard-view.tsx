'use client';

import { AdminAnalyticsPanel } from '@/components/admin-analytics-panel';
import { AdminKpiRow } from '@/components/admin-kpi-row';
import { AdminParcelList } from '@/components/admin-parcel-list';
import type { AdminDashboardData } from '@/components/admin-dashboard-types';

type AdminDashboardViewProps = {
  data: AdminDashboardData;
};

export function AdminDashboardView({ data }: AdminDashboardViewProps) {
  return (
    <>
      <AdminKpiRow stats={data.stats} />
      <AdminAnalyticsPanel analytics={data.analytics} />
      <AdminParcelList seedParcels={data.parcels} />
    </>
  );
}
