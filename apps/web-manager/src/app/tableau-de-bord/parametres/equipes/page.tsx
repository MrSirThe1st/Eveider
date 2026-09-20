import { PageFrame } from '@eveider/ui';
import { AdminEveiderTeamPanel } from '@/components/admin-eveider-team-panel';
import { loadEveiderTeamPage } from '@/server/eveider-team';
import { getAdminSession } from '@/server/session';

export default async function AdminTeamsSettingsPage() {
  const session = await getAdminSession();
  const data = await loadEveiderTeamPage(session.ctx, session.profile.id);

  return (
    <PageFrame
      title="Personnel interne"
      description="Dispatchers et accès plateforme. La flotte opérationnelle se gère dans Flotte."
      layout="wide"
    >
      <AdminEveiderTeamPanel
        dispatchers={data.dispatchers}
        drivers={data.drivers}
        invites={data.invites}
        canManage={data.canManage}
        addDriverHref={data.addDriverHref}
      />
    </PageFrame>
  );
}
