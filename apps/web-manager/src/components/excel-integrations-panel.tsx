'use client';

import { spacing } from '@eveider/config-ui';
import { Button } from '@eveider/ui';
import Link from 'next/link';
import { useState } from 'react';
import { ParcelImportWizard } from '@/components/parcel-import-wizard';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { SettingsFormSection } from '@/components/ops-ui';

export function ExcelIntegrationsPanel() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <section className="ops-form">
      <SettingsFormSection
        title="Import colis"
        description="Créez plusieurs colis à partir d’un fichier Excel avec aperçu et rapport d’erreurs. L’import quotidien se fait aussi depuis Colis."
      >
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => setImportOpen(true)}>
            Importer un fichier Excel
          </Button>
          <Link href={WEB_ROUTES.businessParcels} className="nb-btn nb-btn-secondary">
            Voir les colis
          </Link>
        </div>
      </SettingsFormSection>

      <ParcelImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
    </section>
  );
}
