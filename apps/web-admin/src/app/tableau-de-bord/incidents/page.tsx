import { PageHeader } from '@eveider/ui';
import { AdminIssueList } from '@/components/admin-issue-list';

export default function AdminIssuesPage() {
  return (
    <>
      <PageHeader
        title="Incidents & support"
        description="Signalements clients et coursiers à traiter."
      />
      <AdminIssueList />
    </>
  );
}
