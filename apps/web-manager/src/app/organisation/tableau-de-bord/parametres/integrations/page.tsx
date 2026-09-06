import { PageFrame } from '@eveider/ui';
import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationIntegrationsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <PageFrame
      title="Excel"
      description="Importer et exporter vos colis via un fichier Excel."
      layout="standard"
    >
      <ExcelIntegrationsPanel variant="business" />
    </PageFrame>
  );
}
