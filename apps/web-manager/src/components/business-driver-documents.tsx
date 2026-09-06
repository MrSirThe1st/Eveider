import { colors, spacing } from '@eveider/config-ui';
import { Card, CardHeader } from '@eveider/ui';
import type { DriverDetail } from '@/server/drivers';

type BusinessDriverDocumentsProps = {
  driver: DriverDetail;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: spacing[4],
        flexWrap: 'wrap',
        padding: `${spacing[3]}px 0`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <span style={{ color: colors.textMuted }}>{label}</span>
      <span style={{ color: colors.secondary }}>{children}</span>
    </div>
  );
}

export function BusinessDriverDocuments({ driver }: BusinessDriverDocumentsProps) {
  return (
    <div style={{ display: 'grid', gap: spacing[5] }}>
      <Card>
        <CardHeader
          title="Pièces enregistrées"
          description="Les documents sont transmis à Eveider pour le dossier. Le chauffeur peut livrer sans attendre une validation."
        />
        <Row label="Statut">{driver.dossierStatusLabel}</Row>
        <Row label="Invitation sur le téléphone">{driver.invitedAt ? 'Envoyée' : 'Non envoyée'}</Row>
        {driver.reviewNotes ? <Row label="Notes">{driver.reviewNotes}</Row> : null}
      </Card>

      <Card>
        <CardHeader title="Documents chauffeur" />
        <Row label="Pièce d’identité">
          <a href={driver.idDocumentUrl} target="_blank" rel="noreferrer" className="nb-data-table__link">
            Voir le document
          </a>
        </Row>
        <Row label="Documents véhicule">
          <span style={{ color: colors.textMuted }}>—</span>
        </Row>
      </Card>
    </div>
  );
}
