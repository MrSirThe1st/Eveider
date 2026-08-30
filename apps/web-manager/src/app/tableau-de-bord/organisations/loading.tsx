import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminOrganizationsLoading() {
  return (
    <PageFrame
      title="Organisations"
      description="Annuaire des organisations Eveider."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
