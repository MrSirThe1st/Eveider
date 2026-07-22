import { PageHeader } from '@eveider/ui';
import { CreateParcelForm } from '@/components/create-parcel-form';

export default function NewParcelPage() {
  return (
    <>
      <PageHeader
        title="Nouveau colis"
        description="Enregistrez un colis pour livraison en casier."
      />
      <CreateParcelForm />
    </>
  );
}
