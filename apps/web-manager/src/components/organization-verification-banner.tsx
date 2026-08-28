import { colors, radius, spacing, typography } from '@eveider/config-ui';
import type { OrganizationVerificationStatus } from '@eveider/domain';
import Link from 'next/link';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { VerificationStatusBadge } from './verification-status-badge';

type OrganizationVerificationBannerProps = {
  status: OrganizationVerificationStatus;
  reviewNotes?: string | null;
};

function copyFor(status: OrganizationVerificationStatus): { title: string; body: string; action: string } | null {
  if (status === 'approved') return null;
  if (status === 'pending') {
    return {
      title: 'Dossier en cours de vérification',
      body: 'Vous pouvez continuer à utiliser la plateforme. Notre équipe examine votre dossier.',
      action: 'Voir le dossier',
    };
  }
  if (status === 'correction_requested') {
    return {
      title: 'Correction requise sur le dossier KYC',
      body: 'Mettez à jour les informations demandées, puis renvoyez le dossier.',
      action: 'Corriger le dossier',
    };
  }
  if (status === 'rejected') {
    return {
      title: 'Vérification refusée',
      body: 'Vous pouvez toujours utiliser la plateforme. Soumettez un nouveau dossier si besoin.',
      action: 'Reprendre la vérification',
    };
  }
  return {
    title: 'Faites vérifier votre organisation',
    body: 'La vérification est optionnelle. Elle confirme votre identité auprès d’Eveider (société enregistrée ou vendeur individuel).',
    action: 'Obtenir la vérification',
  };
}

export function OrganizationVerificationBanner({ status, reviewNotes }: OrganizationVerificationBannerProps) {
  const copy = copyFor(status);
  if (!copy) return null;

  const warning = status === 'correction_requested' || status === 'rejected';

  return (
    <div
      role="status"
      style={{
        marginBottom: spacing[6],
        padding: `${spacing[4]}px ${spacing[5]}px`,
        borderRadius: radius.card,
        border: `1px solid ${warning ? colors.warning : colors.info}`,
        background: warning ? colors.warningMuted : colors.infoMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[4],
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
          <p
            style={{
              margin: 0,
              fontWeight: typography.weights.bold,
              fontSize: typography.bodySm.fontSize,
              color: colors.secondary,
            }}
          >
            {copy.title}
          </p>
          <VerificationStatusBadge status={status} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: typography.caption.fontSize,
            color: colors.textMuted,
          }}
        >
          {copy.body}
        </p>
        {status === 'correction_requested' && reviewNotes ? (
          <p
            style={{
              margin: `${spacing[2]}px 0 0`,
              fontSize: typography.caption.fontSize,
              color: colors.secondary,
              whiteSpace: 'pre-wrap',
            }}
          >
            {reviewNotes}
          </p>
        ) : null}
      </div>
      <Link href={WEB_ROUTES.businessVerification} className="nb-btn nb-btn-secondary nb-btn--sm">
        {copy.action}
      </Link>
    </div>
  );
}
