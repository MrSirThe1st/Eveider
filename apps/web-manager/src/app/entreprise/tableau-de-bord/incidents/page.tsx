import { PageFrame } from '@eveider/ui';
import { BusinessIssueList } from '@/components/business-issue-list';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { requireBusinessPageContext } from '@/server/business';
import { listBusinessIssues } from '@/server/issues';

export default async function BusinessIssuesPage() {
  const { ctx } = await requireBusinessPageContext();
  const issues = await listBusinessIssues(ctx);

  return (
    <PageFrame
      title="Incidents"
      description="Signalements liés à vos colis, traités par Eveider."
      layout="wide"
      breadcrumbs={[
        { label: 'Tableau de bord', href: WEB_ROUTES.businessDashboard },
        { label: 'Incidents' },
      ]}
    >
      <BusinessIssueList issues={issues} />
    </PageFrame>
  );
}
