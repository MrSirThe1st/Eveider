'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import {
  isOrganizationVerificationPending,
  type OrganizationVerificationStatus,
} from '@eveider/domain';
import { VerificationStatusBadge } from '@/components/verification-status-badge';

type AdminOrganizationVerificationTabProps = {
  organizationId: string;
  organizationName: string;
  verificationStatus: OrganizationVerificationStatus;
  reviewNotes: string | null;
  submittedAt: string | null;
};

export function AdminOrganizationVerificationTab({
  organizationId,
  organizationName,
  verificationStatus,
  reviewNotes,
  submittedAt,
}: AdminOrganizationVerificationTabProps) {
  const canReview =
    isOrganizationVerificationPending(verificationStatus) ||
    verificationStatus === 'correction_requested';

  return (
    <section style={{ ...webCardStyle, padding: spacing[5] }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3], alignItems: 'center' }}>
        <VerificationStatusBadge status={verificationStatus} />
        {submittedAt ? (
          <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
            Soumis le{' '}
            {new Intl.DateTimeFormat('fr-CD', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }).format(new Date(submittedAt))}
          </span>
        ) : null}
      </div>

      {reviewNotes ? (
        <p style={{ margin: `${spacing[4]}px 0 0`, fontSize: typography.body.fontSize }}>
          {reviewNotes}
        </p>
      ) : null}

      <div style={{ marginTop: spacing[5] }}>
        {canReview ? (
          <Link
            href={`/tableau-de-bord/organisations/${organizationId}/verification/dossier`}
            className="nb-btn nb-btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            Ouvrir le dossier
          </Link>
        ) : verificationStatus === 'approved' ? (
          <Link
            href={`/tableau-de-bord/organisations/${organizationId}/verification/dossier`}
            className="nb-btn nb-btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            Consulter le dossier
          </Link>
        ) : (
          <p style={{ margin: 0, color: colors.textMuted, fontSize: typography.body.fontSize }}>
            {organizationName} n’a pas encore soumis de dossier de vérification.
          </p>
        )}
      </div>
    </section>
  );
}
