import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminIncidentsLoading() {
  return (
    <PageFrame title="Incidents" description="Signalements clients et coursiers à traiter." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
