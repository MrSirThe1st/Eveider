import { PageFrame } from '@eveider/ui';
import { BusinessTeamPanel } from '@/components/business-team-panel';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessTeam } from '@/server/team';

export default async function OrganizationMembersSettingsPage() {
  const { ctx, profile } = await requireBusinessPermission('manage_team');
  const team = await loadBusinessTeam(ctx, profile.id);

  return (
    <PageFrame
      title="Membres"
      description="Invitez des collègues et choisissez ce qu’ils peuvent faire."
      layout="wide"
      breadcrumbs={[
        { label: 'Paramètres', href: WEB_ROUTES.businessSettings },
        { label: 'Membres' },
      ]}
    >
      <BusinessTeamPanel members={team.members} invites={team.invites} />
    </PageFrame>
  );
}
