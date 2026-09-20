import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationVerificationDossierRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;
  redirect(`/tableau-de-bord/organisations/${id}`);
}
