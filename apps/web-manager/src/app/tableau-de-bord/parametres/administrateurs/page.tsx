import { PageFrame } from '@eveider/ui';
import { AdminPlatformStaffPanel } from '@/components/admin-platform-staff-panel';
import { getAdminSession } from '@/server/session';
import { loadPlatformStaffPage } from '@/server/platform-staff';

export default async function AdminAdminsSettingsPage() {
  const session = await getAdminSession();
  const data = await loadPlatformStaffPage(session.ctx, session.profile.id);

  return (
    <PageFrame
      title="Administrateurs"
      description="Personnes qui gèrent Eveider (super administrateurs et administrateurs)."
      layout="wide"
    >
      <AdminPlatformStaffPanel
        members={data.members}
        invites={data.invites}
        canManage={data.canManage}
      />
    </PageFrame>
  );
}
