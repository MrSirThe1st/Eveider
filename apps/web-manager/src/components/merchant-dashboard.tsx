'use client';

import { colors, radius, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { Button, PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

interface MerchantDashboardProps {
  businessName: string;
  status: string;
  isPhoneVerified: boolean;
  permissions?: Array<{ feature: string; status: string }>;
  limit?: { dailyShipments: number; maxPackageValueUsd: number; codDailyLimitUsd: number } | null;
  parcelsCount?: number;
  deliveredCount?: number;
  pendingCount?: number;
  balanceUsd?: number;
}

export function MerchantDashboard({
  businessName,
  status,
  isPhoneVerified,
  permissions = [],
  limit,
  parcelsCount = 0,
  deliveredCount = 0,
  pendingCount = 0,
  balanceUsd = 0,
}: MerchantDashboardProps) {
  const router = useRouter();

  const isPendingReview = status === 'pending_review' || status === 'pending';
  const isPendingCorrection = status === 'pending_correction';
  const isActive = status === 'active';

  const canCreateShipment =
    isActive && permissions.some((p) => p.feature === 'CREATE_SHIPMENT' && p.status === 'ENABLED');
  const codEnabled = isActive && permissions.some((p) => p.feature === 'COD' && p.status === 'ENABLED');

  return (
    <>
      {!isActive ? (
        <div
          role="status"
          style={{
            marginBottom: spacing[6],
            padding: `${spacing[4]}px ${spacing[5]}px`,
            borderRadius: radius.card,
            border: `1px solid ${isPendingCorrection ? colors.warning : isPendingReview ? colors.info : colors.danger}`,
            background: isPendingCorrection
              ? colors.warningMuted
              : isPendingReview
                ? colors.infoMuted
                : colors.dangerMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: typography.weights.bold,
                fontSize: typography.bodySm.fontSize,
                color: colors.secondary,
              }}
            >
              {isPendingReview
                ? 'Compte en attente de vérification KYC (revue sous 24–48h)'
                : isPendingCorrection
                  ? "Correction requise sur votre dossier d'inscription"
                  : 'Compte en cours de configuration'}
            </p>
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                fontSize: typography.caption.fontSize,
                color: colors.textMuted,
              }}
            >
              {isPendingReview
                ? "La création d'expéditions est désactivée jusqu'à approbation admin."
                : isPendingCorrection
                  ? 'Un administrateur a demandé des corrections sur votre dossier.'
                  : 'Veuillez terminer le wizard de configuration.'}
            </p>
          </div>
          <Link href="/onboarding" className="nb-btn nb-btn-secondary nb-btn--sm">
            {isPendingCorrection ? 'Corriger le dossier' : 'Consulter le dossier'}
          </Link>
        </div>
      ) : null}

      <PageFrame
        title={`Bienvenue, ${businessName}`}
        description="Tableau de bord de vos envois et de votre compte partenaire."
        action={
          <Button
            variant="primary"
            disabled={!canCreateShipment}
            onClick={() => router.push(WEB_ROUTES.businessNewParcel)}
          >
            Nouveau colis
          </Button>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[6],
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: typography.caption.fontSize,
              fontWeight: typography.weights.semibold,
              padding: `${spacing[1]}px ${spacing[2]}px`,
              background: isActive ? colors.successMuted : colors.surfaceMuted,
              color: isActive ? colors.secondary : colors.textMuted,
              borderRadius: radius.sm,
            }}
          >
            {isActive ? 'Compte vérifié' : status}
          </span>
          {isPhoneVerified ? (
            <span
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.primary,
              }}
            >
              Téléphone vérifié
            </span>
          ) : null}
        </div>

        <section
          aria-label="Indicateurs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[5],
            marginBottom: spacing[8],
          }}
        >
          <div style={{ ...webCardStyle, padding: spacing[6] }}>
            <span
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.textMuted,
              }}
            >
              Colis total
            </span>
            <p
              style={{
                margin: `${spacing[3]}px 0 0`,
                fontSize: '2rem',
                fontWeight: typography.weights.bold,
                color: colors.secondary,
                lineHeight: 1,
              }}
            >
              {parcelsCount}
            </p>
          </div>

          <div style={{ ...webCardStyle, padding: spacing[6] }}>
            <span
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.textMuted,
              }}
            >
              Livrés
            </span>
            <p
              style={{
                margin: `${spacing[3]}px 0 0`,
                fontSize: '2rem',
                fontWeight: typography.weights.bold,
                color: colors.secondary,
                lineHeight: 1,
              }}
            >
              {deliveredCount}
            </p>
          </div>

          <div style={{ ...webCardStyle, padding: spacing[6] }}>
            <span
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.textMuted,
              }}
            >
              En cours
            </span>
            <p
              style={{
                margin: `${spacing[3]}px 0 0`,
                fontSize: '2rem',
                fontWeight: typography.weights.bold,
                color: colors.secondary,
                lineHeight: 1,
              }}
            >
              {pendingCount}
            </p>
          </div>

          <div
            style={{
              ...webCardStyle,
              padding: spacing[6],
              background: colors.secondary,
              borderColor: colors.secondary,
            }}
          >
            <span
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: typography.weights.semibold,
                color: colors.primary,
              }}
            >
              Solde COD
            </span>
            <p
              style={{
                margin: `${spacing[3]}px 0 0`,
                fontSize: '2rem',
                fontWeight: typography.weights.bold,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              ${balanceUsd.toFixed(2)}
            </p>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: spacing[6],
          }}
        >
          <div style={{ ...webCardStyle, padding: spacing[6] }}>
            <h2
              style={{
                margin: `0 0 ${spacing[5]}px`,
                fontSize: typography.sectionTitle.fontSize,
                fontWeight: typography.sectionTitle.fontWeight,
              }}
            >
              Actions rapides
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: spacing[3],
              }}
            >
              <Button variant="secondary" onClick={() => router.push(WEB_ROUTES.businessDashboard)}>
                Voir les colis
              </Button>
              <Button variant="secondary" onClick={() => alert('Facturation & relevés COD')}>
                Facturation
              </Button>
              <Button variant="secondary" onClick={() => router.push('/onboarding')}>
                Paramètres
              </Button>
            </div>
          </div>

          <div style={{ ...webCardStyle, padding: spacing[6], background: colors.surfaceMuted }}>
            <h2
              style={{
                margin: `0 0 ${spacing[4]}px`,
                fontSize: typography.body.fontSize,
                fontWeight: typography.weights.bold,
              }}
            >
              Compte & confiance
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[3],
                fontSize: typography.bodySm.fontSize,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3] }}>
                <span style={{ color: colors.textMuted }}>Création colis</span>
                <strong style={{ color: canCreateShipment ? colors.secondary : colors.danger }}>
                  {canCreateShipment ? 'Autorisé' : 'En attente'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3] }}>
                <span style={{ color: colors.textMuted }}>Encaissement COD</span>
                <strong style={{ color: colors.secondary }}>
                  {codEnabled ? 'Actif' : 'Nouveau vendeur'}
                </strong>
              </div>
              {limit ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3] }}>
                    <span style={{ color: colors.textMuted }}>Quota journalier</span>
                    <strong>{limit.dailyShipments} colis/jour</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3] }}>
                    <span style={{ color: colors.textMuted }}>Plafond COD</span>
                    <strong>${limit.codDailyLimitUsd}/jour</strong>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </PageFrame>
    </>
  );
}
