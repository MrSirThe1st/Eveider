import {
  AdminFormerStaffSection,
  AdminPlatformStaffPanel,
} from '@/components/admin-platform-staff-panel';
import { getAdminSession } from '@/server/session';
import { loadPlatformStaffPage } from '@/server/platform-staff';

export default async function AdminAdminsSettingsPage() {
  const session = await getAdminSession();
  const data = await loadPlatformStaffPage(session.ctx, session.profile.id);

  return (
    <AdminPlatformStaffPanel
      members={data.members}
      invites={data.invites}
      canManage={data.canManage}
    >
      {data.formerMembers.length > 0 ? (
        <AdminFormerStaffSection members={data.formerMembers} canManage={data.canManage} />
      ) : null}
    </AdminPlatformStaffPanel>
  );
}
