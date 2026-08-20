import { DashboardOverviewSkeleton, PageFrame } from '@eveider/ui';

export default function AdminDashboardLoading() {
  return (
    <PageFrame
      title="Dashboard"
      description="Indicateurs du jour, alertes et activité réseau."
      layout="standard"
    >
      <DashboardOverviewSkeleton />
    </PageFrame>
  );
}
