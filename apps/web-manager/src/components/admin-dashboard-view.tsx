'use client';

import { colors } from '@eveider/config-ui';
import { CardListSkeleton } from '@eveider/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { AdminAnalyticsPanel } from '@/components/admin-analytics-panel';
import { AdminKpiRow } from '@/components/admin-kpi-row';
import type { AnalyticsReport, DashboardDayRange, DashboardStats } from '@/components/admin-dashboard-types';
import { DASHBOARD_DAY_OPTIONS } from '@/components/admin-dashboard-types';

type AdminDashboardViewProps = {
  stats: DashboardStats;
  children: ReactNode;
};

export function AdminDashboardView({ stats, children }: AdminDashboardViewProps) {
  const [days, setDays] = useState<DashboardDayRange>(7);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === 7) {
      setAnalytics(null);
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      try {
        const response = await fetch(`/api/analytics?days=${days}`, { cache: 'no-store' });
        const result = await response.json();
        if (!cancelled && result.success) {
          setAnalytics(result.data.analytics as AnalyticsReport);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <>
      <AdminKpiRow stats={stats} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, opacity: 0.7 }}>
          Activité réseau
        </h2>

        <div
          style={{
            display: 'inline-flex',
            border: `1px solid ${colors.border}`,
            borderRadius: 999,
            overflow: 'hidden',
            background: colors.surface,
          }}
        >
          {DASHBOARD_DAY_OPTIONS.map((option) => {
            const active = days === option;
            return (
              <button
                key={option}
                type="button"
                disabled={loading}
                onClick={() => setDays(option)}
                style={{
                  border: 'none',
                  background: active ? colors.primary : 'transparent',
                  color: active ? '#ffffff' : colors.secondary,
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {option} J
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <CardListSkeleton cards={1} />
      ) : analytics ? (
        <AdminAnalyticsPanel analytics={analytics} days={days} />
      ) : (
        children
      )}
    </>
  );
}
