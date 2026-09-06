import { PageFrame, TableSkeleton } from '@eveider/ui';
import Link from 'next/link';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessDriversLoading() {
  return (
    <PageFrame
      title="Chauffeurs"
      description="Vos chauffeurs et où ils en sont."
      layout="wide"
      action={
        <Link href={WEB_ROUTES.businessNewDriver} className="nb-btn nb-btn-primary nb-btn--sm">
          Ajouter un chauffeur
        </Link>
      }
    >
      <TableSkeleton />
    </PageFrame>
  );
}
