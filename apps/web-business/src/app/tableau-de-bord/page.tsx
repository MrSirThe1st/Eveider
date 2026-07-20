import { colors, radius, spacing } from '@eveider/config-ui';
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
            href="/tableau-de-bord/colis/nouveau"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              background: 'transparent',
              color: colors.secondary,
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}
          >
            NOUVEAU COLIS
          </Link>
        }
      />
      <ParcelList />
    </>
  );
}
