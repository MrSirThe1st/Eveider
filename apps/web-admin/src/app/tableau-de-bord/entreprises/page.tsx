import { PageHeader } from '@eveider/ui';
import { BusinessList } from '@/components/business-list';

export default function AdminBusinessesPage() {
  return (
    <>
      <PageHeader
        title="Gestion entreprises"
        description="Validation et suivi des comptes partenaires."
      />
      <BusinessList />
    </>
  );
}
