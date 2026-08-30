import { colors, spacing, typography } from '@eveider/config-ui';
import { Card, CardHeader } from '@eveider/ui';
import type { ReactNode } from 'react';
import { DriverStatusBadge } from '@/components/driver-status-badge';
import type { DriverDetail } from '@/server/drivers';

type BusinessDriverOverviewProps = {
  driver: DriverDetail;
  /** Show organization / Eveider fleet on admin screens. */
  showOrganization?: boolean;
};

function dash(value: string | null | undefined): ReactNode {
  if (!value) {
    return <span style={{ color: colors.textMuted }}>—</span>;
  }
  return value;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
      <dd
        style={{
          margin: `${spacing[1]}px 0 0`,
          fontSize: typography.body.fontSize,
          color: colors.secondary,
        }}
      >
        {children}
      </dd>
    </div>
  );
}

export function BusinessDriverOverview({
  driver,
  showOrganization = false,
}: BusinessDriverOverviewProps) {
  return (
    <div style={{ display: 'grid', gap: spacing[5] }}>
      <Card>
        <CardHeader title="Identité" />
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing[5],
            margin: 0,
          }}
        >
          <Field label="Nom">{driver.fullName}</Field>
          <Field label="Téléphone">{dash(driver.phone)}</Field>
          <Field label="E-mail">{driver.email}</Field>
          <Field label="ID chauffeur">{driver.driverCode}</Field>
          {showOrganization ? (
            <Field label="Organisation">{driver.organizationLabel}</Field>
          ) : null}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Situation actuelle" />
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing[5],
            margin: 0,
          }}
        >
          <Field label="Statut">
            <DriverStatusBadge status={driver.status} label={driver.statusLabel} />
          </Field>
          <Field label="Pièces">{driver.dossierStatusLabel}</Field>
          <Field label="Équipe">{dash(driver.team)}</Field>
          <Field label="Zone">{dash(driver.serviceArea)}</Field>
          <Field label="Véhicule">{dash(driver.vehicle)}</Field>
          <Field label="Position actuelle">{dash(driver.currentLocation)}</Field>
          <Field label="Livraison en cours">{dash(driver.currentDelivery)}</Field>
        </dl>
      </Card>
    </div>
  );
}
