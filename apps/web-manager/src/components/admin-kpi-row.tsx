'use client';

import { colors, radius } from '@eveider/config-ui';
import Link from 'next/link';
import type { DashboardStats } from '@/components/admin-dashboard-types';

type QueueItem = {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
};

function QueueGroup({ title, items }: { title: string; items: QueueItem[] }) {
  return (
    <section style={{ flex: '1 1 280px', minWidth: 240 }}>
      <h2
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: colors.textMuted,
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '1rem',
              padding: '0.4rem 0.15rem',
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: radius.sm,
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: item.accent && item.value > 0 ? colors.primary : colors.secondary,
              }}
            >
              {item.value}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

type AdminKpiRowProps = {
  stats: DashboardStats;
};

export function AdminKpiRow({ stats }: AdminKpiRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem 3rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <QueueGroup
        title="À traiter"
        items={[
          {
            label: 'Collectes à assigner',
            value: stats.awaitingAssignment,
            href: '/tableau-de-bord/colis?attention=awaiting_assignment',
            accent: true,
          },
          {
            label: 'Retours à assigner',
            value: stats.awaitingReturnAssignment,
            href: '/tableau-de-bord/colis?attention=return_at_locker',
            accent: true,
          },
          {
            label: 'Livraisons actives',
            value: stats.activeDeliveries,
            href: '/tableau-de-bord/livraisons',
          },
          {
            label: 'Incidents ouverts',
            value: stats.openIssues,
            href: '/tableau-de-bord/incidents',
            accent: true,
          },
        ]}
      />
      <QueueGroup
        title="Réseau"
        items={[
          {
            label: 'Au casier',
            value: stats.atLocker,
            href: '/tableau-de-bord/colis?attention=at_locker',
          },
          {
            label: 'Prêts au retrait',
            value: stats.readyForPickup,
            href: '/tableau-de-bord/colis?attention=ready_for_pickup',
          },
          {
            label: 'Compartiments occupés',
            value: stats.lockerOccupancy.occupied,
            href: '/tableau-de-bord/casiers',
          },
          {
            label: 'Compartiments réservés',
            value: stats.lockerOccupancy.reserved,
            href: '/tableau-de-bord/casiers',
          },
        ]}
      />
    </div>
  );
}
