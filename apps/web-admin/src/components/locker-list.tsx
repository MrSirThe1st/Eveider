'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import type { LockerStatus } from '@eveider/domain';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FlashBanner } from '@/components/flash-banner';
import { LockerStatusBadge } from '@/components/locker-status-badge';

type LockerItem = {
  id: string;
  name: string;
  address: string;
  status: LockerStatus;
  compartmentCounts: {
    available: number;
    occupied: number;
    reserved: number;
    total: number;
  };
};

export function LockerList() {
  const [lockers, setLockers] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLockers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lockers', { cache: 'no-store' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Chargement échoué');
        setLockers([]);
        return;
      }

      setLockers(result.data.lockers);
    } catch {
      setError('Impossible de charger les casiers.');
      setLockers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLockers();
  }, [loadLockers]);

  return (
    <div>
      {loading ? <p style={{ fontWeight: 500 }}>Chargement des casiers…</p> : null}

      {!loading && error ? (
        <div>
          <FlashBanner message={error} variant="error" />
          <button
            type="button"
            onClick={() => void loadLockers()}
            style={{
              height: spacing.buttonHeight,
              padding: '0 1.5rem',
              background: 'transparent',
              color: colors.secondary,
              border: `2px solid ${colors.border}`,
              borderRadius: radius.button,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            RÉESSAYER
          </button>
        </div>
      ) : null}

      {!loading && !error && lockers.length === 0 ? (
        <section
          style={{
            background: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radius.card,
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, letterSpacing: '0.04em' }}>AUCUN CASIER</p>
          <p style={{ margin: '0.75rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
            Exécutez <code>pnpm db:seed</code> pour créer les casiers de démonstration.
          </p>
        </section>
      ) : null}

      {!loading && !error && lockers.length > 0 ? (
        <>
          <p
            style={{
              margin: '0 0 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.06em',
            }}
          >
            {lockers.length} CASIERS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lockers.map((locker) => (
              <Link
                key={locker.id}
                href={`/tableau-de-bord/casiers/${locker.id}`}
                style={{
                  display: 'block',
                  background: colors.surface,
                  border: `2px solid ${colors.border}`,
                  borderRadius: radius.card,
                  padding: '1.25rem 1.5rem',
                  textDecoration: 'none',
                  color: colors.secondary,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>
                      {locker.name}
                    </p>
                    <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
                      {locker.address}
                    </p>
                    <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                      {locker.compartmentCounts.available} dispo ·{' '}
                      {locker.compartmentCounts.occupied} occupé ·{' '}
                      {locker.compartmentCounts.reserved} réservé
                    </p>
                  </div>
                  <LockerStatusBadge status={locker.status} />
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
