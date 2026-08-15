'use client';

import { colors } from '@eveider/config-ui';
import { useEffect, useRef, useState } from 'react';
import { AdminAnalyticsPanel } from '@/components/admin-analytics-panel';
import { AdminKpiRow } from '@/components/admin-kpi-row';
import type { AdminDashboardData, DashboardDayRange } from '@/components/admin-dashboard-types';
import { DASHBOARD_DAY_OPTIONS } from '@/components/admin-dashboard-types';

type AdminDashboardViewProps = {
  data: AdminDashboardData;
};

export function AdminDashboardView({ data: initialData }: AdminDashboardViewProps) {
  const [days, setDays] = useState<DashboardDayRange>(7);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const skipInitialFetch = useRef(true);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?days=${days}`, { cache: 'no-store' });
        const result = await response.json();
        if (!cancelled && result.success) {
          setData(result.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <>
      <AdminKpiRow stats={data.stats} />

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
                  background: active ? colors.secondary : 'transparent',
                  color: active ? colors.surface : colors.secondary,
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

      <AdminAnalyticsPanel analytics={data.analytics} days={days} loading={loading} />
    </>
  );
}
