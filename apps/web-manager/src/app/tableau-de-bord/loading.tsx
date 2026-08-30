import { DashboardOverviewSkeleton, PageFrame } from '@eveider/ui';

export default function AdminDashboardLoading() {
  return (
    <PageFrame
      title="Tableau de bord"
      description="Ce qui se passe aujourd’hui."
      layout="standard"
    >
      <DashboardOverviewSkeleton />
    </PageFrame>
  );
}
