import { PageFrame } from '@eveider/ui';
import { BusinessIssueList } from '@/components/business-issue-list';
import { WEB_ROUTES } from '@/lib/auth-routing';

export default function BusinessIssuesPage() {
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
      <BusinessIssueList />
    </PageFrame>
  );
}
