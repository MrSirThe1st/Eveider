import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDriverLegacyRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/tableau-de-bord/flotte/${id}`);
}
