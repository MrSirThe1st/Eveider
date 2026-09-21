import { createRepositories } from '@eveider/data-access';
import { DriverAccessView } from '@/components/driver-access-view';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { redirect } from 'next/navigation';

export default async function DriverAccessPage() {
  const current = await getCurrentUser();
  if (!current) {
    redirect('/connexion?redirect=/chauffeur');
  }

  const isDriver = current.memberships.some((membership) => membership.role === 'driver');
  if (!isDriver) {
    redirect('/connexion');
  }

  const { accounts } = createRepositories();
  await accounts.activateOnLogin(current.profile);

  return (
    <DriverAccessView
      fullName={current.profile.fullName}
      email={current.profile.email}
    />
  );
}
