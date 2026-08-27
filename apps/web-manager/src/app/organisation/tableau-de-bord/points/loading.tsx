import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function BusinessLockersLoading() {
  return (
    <PageFrame
      title="Points Eveider"
      description="Où envoyer vos colis : lieu, adresse, capacité, compartiments disponibles et statut."
      layout="wide"
    >
      <TableSkeleton />
    </PageFrame>
  );
}
