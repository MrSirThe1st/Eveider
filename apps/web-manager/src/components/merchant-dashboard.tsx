'use client';

import type { BusinessAnalytics } from '@eveider/data-access';
import { colors, radius, spacing, typography, webCardStyle } from '@eveider/config-ui';
import type { BusinessStatus } from '@eveider/domain';
import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { Fragment } from 'react';
import { Bar } from 'react-chartjs-2';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { baseBarOptions, chartPalette, formatDayLabel } from '@/lib/admin-chart-theme';

type MerchantDashboardProps = {
  businessName: string;
  status: BusinessStatus;
  analytics: BusinessAnalytics;
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);
  return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
}

function formatVolumeChange(pct: number | null): string {
  if (pct == null) return 'Pas de mois précédent';
  if (pct === 0) return 'Stable vs mois dernier';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct} % vs mois dernier`;
}

type KpiItemProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
};

function KpiItem({ label, value, hint, accent }: KpiItemProps) {
  return (
    <div
      style={{
        flex: '1 1 120px',
        padding: '0.5rem 1.25rem',
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
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
          color: accent ? colors.danger : colors.secondary,
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
            fontWeight: 500,
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function TrendCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <section style={{ ...webCardStyle, padding: spacing[6] }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: colors.textMuted,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: `${spacing[2]}px 0 0`,
          fontSize: '1.5rem',
          fontWeight: 700,
          color: colors.secondary,
          lineHeight: 1.15,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: `${spacing[2]}px 0 0`,
          fontSize: typography.caption.fontSize,
          color: colors.textMuted,
        }}
      >
        {hint}
      </p>
    </section>
  );
}

export function MerchantDashboard({ businessName, status, analytics }: MerchantDashboardProps) {
  const isPendingReview = status === 'pending_review' || status === 'pending';
  const isPendingCorrection = status === 'pending_correction';
  const isActive = status === 'active';

  const overview = [
    { label: 'Total colis', value: analytics.total, hint: 'Tous statuts' },
    { label: 'Livrés', value: analytics.delivered, hint: 'Retirés au point' },
    { label: 'En transit', value: analytics.inTransit, hint: 'Vers le point' },
    { label: 'En attente de retrait', value: analytics.awaitingPickup, hint: 'Au casier' },
    { label: 'Retours', value: analytics.returned, hint: 'Pas encore suivi' },
    { label: 'Échecs', value: analytics.failed, hint: 'Livraisons échouées', accent: analytics.failed > 0 },
    {
      label: 'Délai moyen',
      value: formatDuration(analytics.avgDeliverySeconds),
      hint: 'Création → retrait',
    },
  ];

  const volumeData = {
    labels: analytics.dailyVolume.map((entry) => formatDayLabel(entry.date)),
    datasets: [
      {
        label: 'Colis créés',
        data: analytics.dailyVolume.map((entry) => entry.count),
        backgroundColor: chartPalette.primary,
        borderRadius: 6,
        maxBarThickness: 18,
      },
    ],
  };

  return (
    <PageFrame
      title={businessName}
      description="Performance de vos expéditions : volume, retrait, délais et points utilisés."
      layout="standard"
    >
      {!isActive ? (
        <div
          role="status"
          style={{
            marginBottom: spacing[6],
            padding: `${spacing[4]}px ${spacing[5]}px`,
            borderRadius: radius.card,
            border: `1px solid ${isPendingCorrection ? colors.warning : isPendingReview ? colors.info : colors.danger}`,
            background: isPendingCorrection
              ? colors.warningMuted
              : isPendingReview
                ? colors.infoMuted
                : colors.dangerMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: typography.weights.bold,
                fontSize: typography.bodySm.fontSize,
                color: colors.secondary,
              }}
            >
              {isPendingReview
                ? 'Compte en attente de vérification'
                : isPendingCorrection
                  ? 'Correction requise sur le dossier KYC'
                  : 'Compte en cours de configuration'}
            </p>
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                fontSize: typography.caption.fontSize,
                color: colors.textMuted,
              }}
            >
              Les indicateurs se remplissent dès les premières expéditions.
            </p>
          </div>
          <Link
            href={isPendingCorrection ? '/onboarding' : WEB_ROUTES.businessSettings}
            className="nb-btn nb-btn-secondary nb-btn--sm"
          >
            {isPendingCorrection ? 'Corriger le dossier KYC' : 'Paramètres'}
          </Link>
        </div>
      ) : null}

      <div style={{ marginBottom: spacing[6] }}>
        <BusinessStatusBadge status={status} />
      </div>

      <section style={{ marginBottom: '2rem' }} aria-label="Vue d’ensemble">
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: colors.textMuted,
          }}
        >
          Vue d&apos;ensemble
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
          {overview.map((item, index) => (
            <Fragment key={item.label}>
              {index > 0 ? (
                <div
                  style={{
                    width: 1,
                    height: 32,
                    backgroundColor: colors.borderSubtle,
                    alignSelf: 'center',
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <KpiItem {...item} />
            </Fragment>
          ))}
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing[5],
          marginBottom: spacing[6],
        }}
      >
        <TrendCard
          title="Volume du mois"
          value={analytics.volumeThisMonth.toLocaleString('fr-CD')}
          hint={formatVolumeChange(analytics.volumeChangePct)}
        />
        <TrendCard
          title="Taux de retrait"
          value={analytics.pickupRate == null ? '—' : `${analytics.pickupRate} %`}
          hint="Colis retirés parmi ceux arrivés au point"
        />
        <TrendCard
          title="Taux de retour"
          value="—"
          hint="Les retours ne sont pas encore un flux Eveider"
        />
        <TrendCard
          title="Performance livraison"
          value={
            analytics.delivered + analytics.failed === 0
              ? '—'
              : `${Math.round((analytics.delivered / (analytics.delivered + analytics.failed)) * 100)} %`
          }
          hint="Retraits réussis hors livraisons échouées"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: spacing[5],
        }}
      >
        <section style={{ ...webCardStyle, padding: '1.25rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Volume de colis
          </p>
          <p style={{ margin: '0.35rem 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
            30 derniers jours
          </p>
          <div style={{ height: 220 }}>
            <Bar data={volumeData} options={baseBarOptions()} />
          </div>
        </section>

        <section style={{ ...webCardStyle, padding: '1.25rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: colors.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Usage des points
          </p>
          <p style={{ margin: '0.35rem 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
            Top casiers pour vos envois
          </p>
          {analytics.topLockers.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: typography.bodySm.fontSize }}>
              Aucun point utilisé pour le moment.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {analytics.topLockers.map((locker, index) => (
                <li
                  key={locker.lockerId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: spacing[3],
                    padding: `${spacing[3]}px 0`,
                    borderTop: index === 0 ? 'none' : `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: typography.bodySm.fontSize }}>
                    {locker.lockerName}
                  </span>
                  <span style={{ color: colors.textMuted, fontWeight: 600 }}>
                    {locker.parcelCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageFrame>
  );
}
