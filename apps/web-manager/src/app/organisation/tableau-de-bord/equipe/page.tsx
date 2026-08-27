import { PageFrame } from '@eveider/ui';
import { BusinessTeamPanel } from '@/components/business-team-panel';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessTeam } from '@/server/team';

export default async function BusinessTeamPage() {
  const { ctx, profile } = await requireBusinessPermission('manage_team');
  const team = await loadBusinessTeam(ctx, profile.id);

  return (
    <PageFrame
      title="Équipe"
      description="Invitez des collaborateurs et définissez ce qu’ils peuvent faire dans l’entreprise."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Équipe' },
      ]}
    >
      <BusinessTeamPanel members={team.members} invites={team.invites} />
    </PageFrame>
  );
}
