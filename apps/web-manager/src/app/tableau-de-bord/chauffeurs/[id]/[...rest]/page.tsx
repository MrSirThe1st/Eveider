import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string; rest: string[] }>;
};

export default async function AdminDriverLegacyNestedRedirectPage({ params }: PageProps) {
  const { id, rest } = await params;
  const suffix = rest.length > 0 ? `/${rest.join('/')}` : '';
  redirect(`/tableau-de-bord/flotte/${id}${suffix}`);
}
