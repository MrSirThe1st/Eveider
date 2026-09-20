import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPointDetailRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/tableau-de-bord/casiers/${id}`);
}
