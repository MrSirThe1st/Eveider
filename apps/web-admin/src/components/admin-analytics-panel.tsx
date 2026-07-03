'use client';

import { colors, radius } from '@eveider/config-ui';
import Link from 'next/link';
import type { AnalyticsReport } from '@/components/admin-dashboard-types';

function formatDayLabel(isoDate: string) {
  const [year = 2026, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-CD', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
}

function RateCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '1.25rem 1rem',
        flex: '1 1 200px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          opacity: 0.7,
        }}
      >
        {label}
      </p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 500, opacity: 0.65 }}>
        {hint}
      </p>
    </article>
  );
}

type AdminAnalyticsPanelProps = {
  analytics: AnalyticsReport;
};

export function AdminAnalyticsPanel({ analytics }: AdminAnalyticsPanelProps) {
  const maxDaily = Math.max(...analytics.dailyDeliveries.map((d) => d.count), 1);

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          margin: '0 0 1rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          opacity: 0.7,
        }}
      >
        ANALYTIQUES · 7 JOURS
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <RateCard
          label="TAUX DE RETRAIT"
          value={`${analytics.pickupSuccessRate}%`}
          hint={`${analytics.collected} retirés · ${analytics.awaitingPickup} en attente`}
        />
        <RateCard
          label="UTILISATION CASIERS"
          value={`${analytics.lockerUsageRate}%`}
          hint="Compartiments occupés"
        />
      </div>

      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            opacity: 0.7,
          }}
        >
          LIVRAISONS TERMINÉES PAR JOUR
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', minHeight: 120 }}>
          {analytics.dailyDeliveries.map((day) => (
            <div
              key={day.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{day.count}</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 48,
                  height: `${Math.max((day.count / maxDaily) * 80, day.count > 0 ? 8 : 4)}px`,
                  background: day.count > 0 ? colors.primary : colors.border,
                  borderRadius: 4,
                }}
              />
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  opacity: 0.7,
                  lineHeight: 1.2,
                }}
              >
                {formatDayLabel(day.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <RankingTable
          title="TOP CASIERS"
          emptyLabel="Aucune activité casier"
          rows={analytics.topLockers.map((item) => ({
            id: item.lockerId,
            name: item.lockerName,
            count: item.parcelCount,
            href: `/tableau-de-bord/casiers/${item.lockerId}`,
          }))}
        />
        <RankingTable
          title="TOP ENTREPRISES"
          emptyLabel="Aucun colis enregistré"
          rows={analytics.topBusinesses.map((item) => ({
            id: item.businessId,
            name: item.businessName,
            count: item.parcelCount,
          }))}
        />
      </div>
    </section>
  );
}

function RankingTable({
  title,
  emptyLabel,
  rows,
}: {
  title: string;
  emptyLabel: string;
  rows: { id: string; name: string; count: number; href?: string }[];
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '1.25rem',
      }}
    >
      <p
        style={{
          margin: '0 0 1rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          opacity: 0.7,
        }}
      >
        {title}
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, opacity: 0.65 }}>{emptyLabel}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((row, index) => (
            <li
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: colors.background,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {row.href ? (
                  <Link
                    href={row.href}
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: colors.secondary,
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.name}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.name}
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
