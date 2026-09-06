import { notFound, redirect } from 'next/navigation';
import { createRepositories } from '@eveider/data-access';
import { adminDriverPath } from '@/lib/auth-routing';
import { getAdminSession } from '@/server/session';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy coursier profile URL — drivers live under Chauffeurs. */
export default async function LegacyCourierProfileRedirect({ params }: PageProps) {
  await getAdminSession();
  const { id: userId } = await params;
  const { courierDossiers } = createRepositories();
  const dossier = await courierDossiers.findByUserId(userId);
  if (!dossier) notFound();
  redirect(adminDriverPath(dossier.id));
}
