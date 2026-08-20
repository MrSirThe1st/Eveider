import { DashboardOverviewSkeleton, PageFrame } from '@eveider/ui';

export default function BusinessDashboardLoading() {
  return (
    <PageFrame title="Tableau de bord" layout="standard">
      <DashboardOverviewSkeleton />
    </PageFrame>
  );
}
