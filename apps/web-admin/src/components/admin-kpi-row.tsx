'use client';

import { colors, radius, shadows, borders, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import type { DashboardStats } from '@/components/admin-dashboard-types';

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: boolean;
};

function KpiCard({ label, value, hint, href, accent }: KpiCardProps) {
  const cardStyle = {
    ...webCardStyle,
    border: `${borders.width}px solid ${accent ? colors.primary : colors.border}`,
    padding: '1.25rem 1rem',
    minWidth: 140,
    flex: '1 1 140px',
    display: 'block' as const,
    textDecoration: 'none' as const,
    color: 'inherit' as const,
  };

  const body = (
    <>
      <p
        style={{
          margin: 0,
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: colors.secondary,
          opacity: 0.7,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '0.5rem 0 0',
          fontSize: '1.75rem',
          fontWeight: 700,
          lineHeight: 1,
          color: colors.secondary,
        }}
      >
        {value}
      </p>
      {hint ? (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 500, opacity: 0.65 }}>
          {hint}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} style={cardStyle}>
        {body}
      </Link>
    );
  }

  return <div style={cardStyle}>{body}</div>;
}

type AdminKpiRowProps = {
  stats: DashboardStats;
};

export function AdminKpiRow({ stats }: AdminKpiRowProps) {
  const occupancyRate =
    stats.lockerOccupancy.total > 0
      ? Math.round((stats.lockerOccupancy.occupied / stats.lockerOccupancy.total) * 100)
      : 0;

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          margin: '0 0 1rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: colors.secondary,
          opacity: 0.7,
        }}
      >
        AUJOURD&apos;HUI
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <KpiCard label="COLIS CRÉÉS" value={stats.parcelsToday} hint="Depuis minuit" />
        <KpiCard
          label="LIVRAISONS ACTIVES"
          value={stats.activeDeliveries}
          hint="Assignées · scannées · dépôt"
          href="/tableau-de-bord/livraisons"
        />
        <KpiCard label="DÉPÔTS TERMINÉS" value={stats.completedToday} hint="Aujourd'hui" />
        <KpiCard
          label="PRÊTS RETRAIT"
          value={stats.readyForPickup}
          hint="En attente client"
          accent={stats.readyForPickup > 0}
        />
        <KpiCard
          label="INCIDENTS OUVERTS"
          value={stats.openIssues}
          hint="À traiter"
          href="/tableau-de-bord/incidents"
          accent={stats.openIssues > 0}
        />
        <KpiCard
          label="OCCUPATION CASIERS"
          value={`${occupancyRate}%`}
          hint={`${stats.lockerOccupancy.occupied} / ${stats.lockerOccupancy.total} compartiments`}
          href="/tableau-de-bord/casiers"
        />
      </div>
    </section>
  );
}
