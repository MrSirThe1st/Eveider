import { PageFrame } from '@eveider/ui';
import { AdminIssueList } from '@/components/admin-issue-list';
import { listIssues } from '@/server/issues';
import { getAdminSession } from '@/server/session';

export default async function AdminIssuesPage() {
  const { ctx } = await getAdminSession();
  const issues = await listIssues(ctx);

  return (
    <PageFrame
      title="Incidents & support"
      description="Signalements clients et coursiers à traiter."
    >
      <AdminIssueList issues={issues} />
    </PageFrame>
  );
}
