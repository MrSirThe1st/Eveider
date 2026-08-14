'use client';

import { colors, webCardStyle } from '@eveider/config-ui';
import { usesCompartmentGrid } from '@eveider/domain';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LockerStatusBadge } from '@/components/locker-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import { fetchJson } from '@/lib/api/fetch-json';
import type { LockerSummaryDto } from '@/lib/locker-presenter';

type LockerListProps = {
  lockers: LockerSummaryDto[];
};

export function LockerList({ lockers: seedLockers }: LockerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lockers, setLockers] = useState(seedLockers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedSearch) {
      setLockers(seedLockers);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchJson<{ lockers: LockerSummaryDto[] }>(
          `/api/lockers?search=${encodeURIComponent(debouncedSearch)}`,
        );
        if (!cancelled) setLockers(data.lockers);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, seedLockers]);

  if (seedLockers.length === 0 && !debouncedSearch) {
    return (
      <section style={{ ...webCardStyle, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Aucun point Eveider</p>
      </section>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un point par code ou nom…"
          ariaLabel="Rechercher un point Eveider"
        />
      </div>
      <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.8125rem' }}>
        {loading ? 'Recherche…' : `${lockers.length} point${lockers.length > 1 ? 's' : ''}`}
      </p>
      {lockers.length === 0 ? (
        <section style={{ ...webCardStyle, padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Aucun point pour cette recherche</p>
        </section>
      ) : (
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
                </div>
                <LockerStatusBadge status={locker.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
