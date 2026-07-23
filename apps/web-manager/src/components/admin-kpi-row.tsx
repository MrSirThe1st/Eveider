'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
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
    background: accent ? '#E8FCE8' : colors.surface,
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
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: colors.textMuted,
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
          fontSize: '1rem',
          fontWeight: 600,
          color: colors.textMuted,
        }}
      >
        Aujourd&apos;hui
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <KpiCard label="Colis créés" value={stats.parcelsToday} hint="Depuis minuit" />
        <KpiCard
          label="Livraisons actives"
          value={stats.activeDeliveries}
          hint="Assignées · scannées · dépôt"
          href="/tableau-de-bord/livraisons"
        />
        <KpiCard label="Dépôts terminés" value={stats.completedToday} hint="Aujourd'hui" />
        <KpiCard
          label="Prêts retrait"
          value={stats.readyForPickup}
          hint="En attente client"
          accent={stats.readyForPickup > 0}
        />
        <KpiCard
          label="Incidents ouverts"
          value={stats.openIssues}
          hint="À traiter"
          href="/tableau-de-bord/incidents"
          accent={stats.openIssues > 0}
        />
        <KpiCard
          label="Occupation casiers"
          value={`${occupancyRate}%`}
          hint={`${stats.lockerOccupancy.occupied} / ${stats.lockerOccupancy.total} compartiments`}
          href="/tableau-de-bord/points"
        />
      </div>
    </section>
  );
}
