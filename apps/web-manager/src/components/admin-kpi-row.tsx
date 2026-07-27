'use client';

import { colors, radius } from '@eveider/config-ui';
import Link from 'next/link';
import type { DashboardStats } from '@/components/admin-dashboard-types';
import { Fragment } from 'react';

type KpiItemProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: boolean;
};

function KpiItem({ label, value, hint, href, accent }: KpiItemProps) {
  const itemStyle: React.CSSProperties = {
    flex: '1 1 140px',
    padding: '0.5rem 1.5rem',
    minWidth: 140,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background-color 0.2s ease',
    borderRadius: radius.sm,
  };

  const body = (
    <>
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: accent ? colors.primary : colors.secondary,
          marginTop: '0.25rem',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {hint ? (
        <span
          style={{
            fontSize: '0.6875rem',
            color: colors.textMuted,
            marginTop: '0.25rem',
            opacity: 0.8,
            fontWeight: 500,
          }}
        >
          {hint}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={itemStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceSubtle;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }}
      >
        {body}
      </Link>
    );
  }

  return <div style={itemStyle}>{body}</div>;
}

type AdminKpiRowProps = {
  stats: DashboardStats;
};

export function AdminKpiRow({ stats }: AdminKpiRowProps) {
  const occupancyRate =
    stats.lockerOccupancy.total > 0
      ? Math.round((stats.lockerOccupancy.occupied / stats.lockerOccupancy.total) * 100)
      : 0;

  const items = [
    {
      label: 'Colis créés',
      value: stats.parcelsToday,
      hint: 'Depuis minuit',
      href: '/tableau-de-bord/colis',
    },
    {
      label: 'Livraisons actives',
      value: stats.activeDeliveries,
      hint: 'Assignées · scannées · dépôt',
      href: '/tableau-de-bord/livraisons',
    },
    { label: 'Dépôts terminés', value: stats.completedToday, hint: "Aujourd'hui" },
    {
      label: 'Prêts retrait',
      value: stats.readyForPickup,
      hint: 'En attente client',
      accent: stats.readyForPickup > 0,
      href: '/tableau-de-bord/colis',
    },
    {
      label: 'Incidents ouverts',
      value: stats.openIssues,
      hint: 'À traiter',
      href: '/tableau-de-bord/incidents',
      accent: stats.openIssues > 0,
    },
    {
      label: 'Occupation casiers',
      value: `${occupancyRate}%`,
      hint: `${stats.lockerOccupancy.occupied} / ${stats.lockerOccupancy.total}`,
      href: '/tableau-de-bord/points',
    },
  ];

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
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.borderSubtle}`,
          padding: '1.25rem 0',
          width: '100%',
          flexWrap: 'wrap',
          gap: '0.5rem 0',
        }}
      >
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && (
              <div
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: colors.borderSubtle,
                  alignSelf: 'center',
                  flexShrink: 0,
                }}
              />
            )}
            <KpiItem {...item} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
