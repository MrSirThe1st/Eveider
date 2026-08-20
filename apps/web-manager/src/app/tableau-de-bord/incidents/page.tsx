import { PageFrame } from '@eveider/ui';
import { AdminIssueList } from '@/components/admin-issue-list';
import { AdminLivraisonsTabs } from '@/components/admin-module-tabs';
import { listIssues } from '@/server/issues';
import { getAdminSession } from '@/server/session';

export default async function AdminIssuesPage() {
  const { ctx } = await getAdminSession();
  const issues = await listIssues(ctx);

  return (
    <PageFrame
      title="Incidents"
      description="Signalements clients et coursiers à traiter."
      layout="wide"
    >
      <AdminLivraisonsTabs />
      <AdminIssueList issues={issues} />
    </PageFrame>
  );
}
