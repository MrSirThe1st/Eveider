import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';
import { requireBusinessPermission } from '@/server/business';

export default async function OrganizationIntegrationsSettingsPage() {
  await requireBusinessPermission('settings');
  return (
    <div>
      <p style={{ marginTop: 0, marginBottom: '1.5rem', opacity: 0.75 }}>
        Importez et exportez vos colis via Excel. D’autres intégrations arriveront prochainement.
      </p>
      <ExcelIntegrationsPanel variant="business" />
    </div>
  );
}
