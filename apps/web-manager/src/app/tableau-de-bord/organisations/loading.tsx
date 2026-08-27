import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function AdminBusinessesLoading() {
  return (
    <PageFrame
      title="Entreprises"
      description="Répertoire des comptes partenaires vérifiés et actifs."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
