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
      title: 'Pièces en cours de contrôle',
      body: 'Vous pouvez déjà envoyer des colis. Notre équipe lit vos documents.',
      action: 'Voir la demande',
    };
  }
  if (status === 'correction_requested') {
    return {
      title: 'Il manque une correction',
      body: 'Mettez à jour ce qui est demandé, puis renvoyez.',
      action: 'Corriger',
    };
  }
  if (status === 'rejected') {
    return {
      title: 'Documents refusés',
      body: 'Vous pouvez toujours envoyer des colis. Vous pouvez renvoyer une nouvelle demande.',
      action: 'Renvoyer les pièces',
    };
  }
  return {
    title: 'Vérifier votre entreprise',
    body: 'Ce n’est pas obligatoire. Cela confirme qui vous êtes auprès d’Eveider (société ou vendeur).',
    action: 'Envoyer les pièces',
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
