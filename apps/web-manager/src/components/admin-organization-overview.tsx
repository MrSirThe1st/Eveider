'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import { Button, Card, CardHeader, InlineAlert, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminAccountStatusBadge } from '@/components/admin-account-status-badge';
import { VerificationStatusBadge } from '@/components/verification-status-badge';
import { AdminOrganizationOperatingAccess } from '@/components/admin-organization-operating-access';
import { fetchJson } from '@/lib/api/fetch-json';
import type { AdminOrganizationSummary, OrganizationOperatingAccessDto } from '@/server/organizations';

type AdminOrganizationOverviewProps = {
  organization: AdminOrganizationSummary;
  operatingAccess: OrganizationOperatingAccessDto;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt
        style={{
          margin: 0,
          fontSize: typography.caption.fontSize,
          color: colors.textMuted,
          fontWeight: typography.weights.medium,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.body.fontSize }}>
        {children}
      </dd>
    </div>
  );
}

export function AdminOrganizationOverview({
  organization,
  operatingAccess,
}: AdminOrganizationOverviewProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateAccountStatus(nextStatus: 'active' | 'suspended') {
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/businesses/${organization.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(nextStatus === 'active' ? 'Organisation réactivée' : 'Organisation suspendue');
      router.refresh();
    } catch {
      setError('Action impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: spacing[5] }}>
      <Card>
        <CardHeader title="Statuts" />
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', alignItems: 'center' }}>
          <AdminAccountStatusBadge status={organization.accountStatus} />
          <VerificationStatusBadge status={organization.verificationStatus} />
        </div>
        <div style={{ display: 'flex', gap: spacing[3], marginTop: spacing[4], flexWrap: 'wrap' }}>
          {organization.accountStatus === 'active' ? (
            <Button
              variant="secondary"
              loading={saving}
              onClick={() => void updateAccountStatus('suspended')}
            >
              Suspendre le compte
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={saving}
              onClick={() => void updateAccountStatus('active')}
            >
              Réactiver le compte
            </Button>
          )}
        </div>
        {error ? <InlineAlert message={error} variant="error" /> : null}
      </Card>

      <Card>
        <CardHeader title="Informations générales" />
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing[5],
            margin: 0,
          }}
        >
          <Field label="E-mail">{organization.contactEmail ?? '—'}</Field>
          <Field label="Téléphone">{organization.contactPhone ?? '—'}</Field>
          <Field label="Secteur">{organization.industry ?? '—'}</Field>
          <Field label="Type">{organization.businessType ?? '—'}</Field>
          <Field label="Code d’accès">{organization.accessCode ?? '—'}</Field>
          <Field label="Créée le">
            {new Intl.DateTimeFormat('fr-CD', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }).format(new Date(organization.createdAt))}
          </Field>
        </dl>
      </Card>

      <AdminOrganizationOperatingAccess
        organizationId={organization.id}
        initialAccess={operatingAccess}
      />
    </div>
  );
}
