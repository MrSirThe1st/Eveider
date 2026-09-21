import { PageFrame } from '@eveider/ui';
import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationIntegrationsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <PageFrame
      title="Excel"
      description="Import de fichiers Excel. L’import quotidien se fait aussi depuis Colis."
      layout="standard"
    >
      <ExcelIntegrationsPanel />
    </PageFrame>
  );
}
