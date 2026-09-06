import { AdminIssueList } from '@/components/admin-issue-list';
import { listIssues } from '@/server/issues';
import { getAdminSession } from '@/server/session';

export default async function AdminIssuesPage() {
  const { ctx } = await getAdminSession();
  const issues = await listIssues(ctx);

  return <AdminIssueList issues={issues} />;
}
