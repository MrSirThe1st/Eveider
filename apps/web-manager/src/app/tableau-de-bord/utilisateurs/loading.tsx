import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminUsersLoading() {
  return (
    <PageFrame title="Utilisateurs" layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
