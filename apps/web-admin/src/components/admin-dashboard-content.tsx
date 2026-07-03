'use client';

import { colors, radius } from '@eveider/config-ui';
import { useCallback, useEffect, useState } from 'react';
import { AdminAnalyticsPanel } from '@/components/admin-analytics-panel';
import { AdminKpiRow } from '@/components/admin-kpi-row';
import { AdminParcelList } from '@/components/admin-parcel-list';
import type { AdminDashboardData } from '@/components/admin-dashboard-types';

export function AdminDashboardContent() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard?days=7', { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Chargement échoué');
        setData(null);
        return;
      }

      setData(result.data);
    } catch {
      setError('Impossible de charger le tableau de bord.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p style={{ fontWeight: 500, marginBottom: '1.5rem' }}>Chargement du tableau de bord…</p>;
  }

  if (error || !data) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: colors.danger, fontWeight: 500 }}>{error ?? 'Erreur'}</p>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.875rem',
            background: colors.primary,
            border: 'none',
            borderRadius: radius.button,
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            color: colors.secondary,
          }}
        >
          RÉESSAYER
        </button>
      </div>
    );
  }

  return (
    <>
      <AdminKpiRow stats={data.stats} />
      <AdminAnalyticsPanel analytics={data.analytics} />
      <AdminParcelList initialParcels={data.parcels} />
    </>
  );
}
