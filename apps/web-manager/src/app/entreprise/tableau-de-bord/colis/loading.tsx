import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function BusinessParcelsLoading() {
  return (
    <PageFrame title="Colis" description="Suivi des colis de votre entreprise." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
