import { BusinessTeamPanel } from '@/components/business-team-panel';
import { requireBusinessPermission } from '@/server/business';
import { loadBusinessTeam } from '@/server/team';

export default async function OrganizationTeamSettingsPage() {
  const { ctx, profile } = await requireBusinessPermission('manage_team');
  const team = await loadBusinessTeam(ctx, profile.id);

  return <BusinessTeamPanel members={team.members} invites={team.invites} />;
}
