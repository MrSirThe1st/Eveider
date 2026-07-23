import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminLockerDetailRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/tableau-de-bord/points/${id}`);
}
