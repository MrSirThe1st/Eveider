import { PageFrame } from '@eveider/ui';
import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationIntegrationsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <PageFrame
      title="Excel"
      description="Import et export de fichiers. L’import quotidien se fait aussi depuis Colis."
      layout="standard"
    >
      <ExcelIntegrationsPanel variant="business" />
    </PageFrame>
  );
}
