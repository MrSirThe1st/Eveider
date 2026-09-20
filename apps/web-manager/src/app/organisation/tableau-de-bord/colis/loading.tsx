import { PageFrame, TableSkeleton } from '@eveider/ui';

export default function BusinessParcelsLoading() {
  return (
    <PageFrame title="Colis" description="Identifiez, filtrez et suivez les envois de votre entreprise." layout="wide">
      <TableSkeleton />
    </PageFrame>
  );
}
