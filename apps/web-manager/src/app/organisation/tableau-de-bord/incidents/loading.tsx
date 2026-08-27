import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function BusinessIssuesLoading() {
  return (
    <PageFrame title="Incidents" layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
