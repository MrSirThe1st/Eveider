'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { Button } from '@eveider/ui';
import Link from 'next/link';
import { useState } from 'react';
import { ParcelExportMenu } from '@/components/parcel-export-menu';
import { ParcelImportWizard } from '@/components/parcel-import-wizard';
import { WEB_ROUTES } from '@/lib/auth-routing';

type ExcelIntegrationsPanelProps = {
  variant: 'business' | 'admin';
};

export function ExcelIntegrationsPanel({ variant }: ExcelIntegrationsPanelProps) {
  const [importOpen, setImportOpen] = useState(false);

  if (variant === 'business') {
    return (
      <section style={{ display: 'grid', gap: spacing[4] }}>
        <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
          <div>
            <h2 style={{ margin: 0, ...typography.sectionTitle }}>Import colis</h2>
            <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
              Créez plusieurs colis à partir d’un fichier Excel avec aperçu et rapport d’erreurs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setImportOpen(true)}>
              Importer un fichier Excel
            </Button>
            <Link href={WEB_ROUTES.businessParcels} className="nb-btn nb-btn-secondary nb-btn--sm">
              Voir les colis
            </Link>
          </div>
        </div>

        <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
          <div>
            <h2 style={{ margin: 0, ...typography.sectionTitle }}>Export colis</h2>
            <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
              Exportez vos colis au format .xlsx depuis la liste ou directement ici.
            </p>
          </div>
          <ParcelExportMenu exportPath="/api/organisation/parcels/export" />
        </div>

        <ParcelImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: spacing[4] }}>
      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Export colis</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Export plateforme de tous les colis ou de la sélection filtrée sur la page Colis.
          </p>
        </div>
        <ParcelExportMenu exportPath="/api/parcels/export" />
      </div>

      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Export livraisons</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Export du tableau de bord livraisons (filtres actifs ou ensemble complet).
          </p>
        </div>
        <ParcelExportMenu exportPath="/api/deliveries/board/export" />
        <Link href="/tableau-de-bord/livraisons" className="nb-btn nb-btn-secondary nb-btn--sm">
          Ouvrir les livraisons
        </Link>
      </div>
    </section>
  );
}
