import { PageFrame } from '@eveider/ui';
import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';

export default function AdminIntegrationsSettingsPage() {
  return (
    <PageFrame
      title="Exports Excel"
      description="Télécharger les colis et livraisons de toute la plateforme en fichier Excel."
      layout="standard"
    >
      <ExcelIntegrationsPanel variant="admin" />
    </PageFrame>
  );
}
