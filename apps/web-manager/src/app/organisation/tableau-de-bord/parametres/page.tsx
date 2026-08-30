import { getBusinessPermissions } from '@eveider/domain';
import { redirect } from 'next/navigation';
import { firstOrganizationSettingsPath } from '@/lib/settings-nav';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationSettingsIndexPage() {
  const { profile } = await requireBusinessPageContext();
  redirect(firstOrganizationSettingsPath(getBusinessPermissions(profile.userRole)));
}
