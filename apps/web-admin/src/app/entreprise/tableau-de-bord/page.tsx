import { colors, spacing, webPrimaryButtonStyle } from '@eveider/config-ui';
import { PageHeader } from '@eveider/ui';
import Link from 'next/link';
import { ParcelList } from '@/components/parcel-list';

export default function BusinessDashboardPage() {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Suivez vos colis et leur statut de livraison."
        action={
          <Link
            href="/entreprise/tableau-de-bord/colis/nouveau"
            style={{
              ...webPrimaryButtonStyle,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              fontSize: '0.9375rem',
              textDecoration: 'none',
            }}
          >
            Nouveau colis
          </Link>
        }
      />
      <ParcelList />
    </>
  );
}
