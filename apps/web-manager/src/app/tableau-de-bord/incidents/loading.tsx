import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminIncidentsLoading() {
  return (
    <PageFrame title="Incidents" description="Problèmes signalés, à traiter." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
