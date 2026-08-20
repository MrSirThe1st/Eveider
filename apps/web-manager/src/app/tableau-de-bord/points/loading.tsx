import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminPointsLoading() {
  return (
    <PageFrame
      title="Points"
      description="Casiers intelligents, points partenaires et points résidentiels."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
