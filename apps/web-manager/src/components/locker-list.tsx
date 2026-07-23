'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import Link from 'next/link';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import type { LockerSummaryDto } from '@/lib/locker-presenter';

type LockerListProps = {
  lockers: LockerSummaryDto[];
};

export function LockerList({ lockers }: LockerListProps) {
  if (lockers.length === 0) {
    return (
      <section
        style={{
          ...webCardStyle,
          padding: '2.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Aucun point Eveider</p>
        <p style={{ margin: '0.75rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
          Placez un repère sur la carte pour créer le premier point, ou exécutez{' '}
          <code>pnpm db:seed</code>.
        </p>
      </section>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.8125rem' }}>
        {lockers.length} points
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {lockers.map((locker) => (
          <Link
            key={locker.id}
            href={`/tableau-de-bord/points/${locker.id}`}
            style={{
              display: 'block',
              ...webCardStyle,
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
                <p style={{ margin: 0, fontWeight: 700 }}>{locker.name}</p>
                <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                  {locker.typeLabel} · {locker.code}
                </p>
                <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
                  {locker.address}
                </p>
                <p style={{ margin: '0.35rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
                  {usesCompartmentGrid(locker.type)
                    ? `${locker.compartmentCounts.available} dispo · ${locker.compartmentCounts.occupied} occupé · ${locker.compartmentCounts.reserved} réservé`
                    : `${locker.availableSlots} places libres / ${locker.maxCapacity ?? '—'} max`}
                </p>
              </div>
              <LockerStatusBadge status={locker.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
