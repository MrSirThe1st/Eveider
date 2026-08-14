'use client';

import { ISSUE_TYPE_LABELS, PARCEL_STATUS_LABELS } from '@eveider/domain';
import { colors, webCardStyle } from '@eveider/config-ui';
import type { ReactNode } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import type { AnalyticsReport, DashboardDayRange } from '@/components/admin-dashboard-types';
import {
  baseBarOptions,
  baseDoughnutOptions,
  baseLineOptions,
  chartPalette,
  formatDayLabel,
  issueTypeColors,
  parcelStatusColors,
} from '@/lib/admin-chart-theme';

type AdminAnalyticsPanelProps = {
  analytics: AnalyticsReport;
  days: DashboardDayRange;
  loading?: boolean;
};

function ChartCard({
  title,
  subtitle,
  children,
  loading,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <div style={{ ...webCardStyle, padding: '1.25rem', opacity: loading ? 0.65 : 1 }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          opacity: 0.7,
        }}
      >
        {title}
      </p>
      {subtitle ? (
        <p
          style={{
            margin: '0.35rem 0 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: colors.textMuted,
          }}
        >
          {subtitle}
        </p>
      ) : (
        <div style={{ marginBottom: '0.85rem' }} />
      )}
      <div style={{ height: 220 }}>{children}</div>
    </div>
  );
}

export function AdminAnalyticsPanel({ analytics, days, loading }: AdminAnalyticsPanelProps) {
  const dayLabels = analytics.dailyDeliveries.map((entry) => formatDayLabel(entry.date));

  const completedDeliveriesData = {
    labels: dayLabels,
    datasets: [
      {
        label: 'Livraisons terminées',
        data: analytics.dailyDeliveries.map((entry) => entry.count),
        backgroundColor: chartPalette.primary,
        borderRadius: 6,
        maxBarThickness: 36,
      },
    ],
  };

  const parcelsCreatedData = {
    labels: analytics.dailyParcelsCreated.map((entry) => formatDayLabel(entry.date)),
    datasets: [
      {
        label: 'Colis créés',
        data: analytics.dailyParcelsCreated.map((entry) => entry.count),
        borderColor: chartPalette.secondary,
        backgroundColor: 'rgba(18, 18, 18, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: chartPalette.secondary,
      },
    ],
  };

  const statusEntries = analytics.parcelsByStatus.filter((entry) => entry.count > 0);
  const parcelsByStatusData = {
    labels: statusEntries.map((entry) => PARCEL_STATUS_LABELS[entry.status]),
    datasets: [
      {
        data: statusEntries.map((entry) => entry.count),
        backgroundColor: statusEntries.map((entry) => parcelStatusColors[entry.status] ?? chartPalette.muted),
        borderWidth: 0,
      },
    ],
  };

  const topLockers = analytics.topLockers.slice(0, 5);
  const topLockersData = {
    labels: topLockers.map((locker) => locker.lockerName),
    datasets: [
      {
        label: 'Colis',
        data: topLockers.map((locker) => locker.parcelCount),
        backgroundColor: chartPalette.secondary,
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };

  const issueEntries = analytics.openIssuesByType.filter((entry) => entry.count > 0);
  const openIssuesData = {
    labels: issueEntries.map((entry) => ISSUE_TYPE_LABELS[entry.type]),
    datasets: [
      {
        label: 'Incidents ouverts',
        data: issueEntries.map((entry) => entry.count),
        backgroundColor: issueEntries.map((entry) => issueTypeColors[entry.type] ?? chartPalette.muted),
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };

  const barOptions = baseBarOptions();
  const lineOptions = baseLineOptions();
  const horizontalBarOptions: ChartOptions<'bar'> = {
    ...barOptions,
    indexAxis: 'y',
    scales: {
      ...barOptions.scales,
      x: {
        ...barOptions.scales?.x,
        grid: { color: colors.borderSubtle },
      },
      y: {
        ...barOptions.scales?.y,
        grid: { display: false },
      },
    },
  };

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <ChartCard
          title="LIVRAISONS TERMINÉES / JOUR"
          subtitle={`${days} derniers jours`}
          loading={loading}
        >
          <Bar data={completedDeliveriesData} options={barOptions} />
        </ChartCard>

        <ChartCard
          title="COLIS PAR STATUT"
          subtitle={`Colis créés sur ${days} jours · statut actuel`}
          loading={loading}
        >
          {statusEntries.length > 0 ? (
            <Doughnut data={parcelsByStatusData} options={baseDoughnutOptions()} />
          ) : (
            <EmptyChart message="Aucun colis sur la période" />
          )}
        </ChartCard>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <ChartCard title="COLIS CRÉÉS / JOUR" subtitle={`${days} derniers jours`} loading={loading}>
          <Line data={parcelsCreatedData} options={lineOptions} />
        </ChartCard>

        <ChartCard title="TOP POINTS" subtitle="Activité casier sur la période" loading={loading}>
          {topLockers.length > 0 ? (
            <Bar data={topLockersData} options={horizontalBarOptions} />
          ) : (
            <EmptyChart message="Aucune activité casier" />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="INCIDENTS OUVERTS PAR TYPE"
        subtitle="Ouverts et en cours de traitement"
        loading={loading}
      >
        {issueEntries.length > 0 ? (
          <Bar data={openIssuesData} options={barOptions} />
        ) : (
          <EmptyChart message="Aucun incident ouvert" />
        )}
      </ChartCard>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}
