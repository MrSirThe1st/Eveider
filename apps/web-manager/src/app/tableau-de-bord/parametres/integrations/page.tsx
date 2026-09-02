import { ExcelIntegrationsPanel } from '@/components/excel-integrations-panel';

export default function AdminIntegrationsSettingsPage() {
  return (
    <div>
      <p style={{ marginTop: 0, marginBottom: '1.5rem', opacity: 0.75 }}>
        Exports Excel pour les colis, livraisons et analytics plateforme.
      </p>
      <ExcelIntegrationsPanel variant="admin" />
    </div>
  );
}
