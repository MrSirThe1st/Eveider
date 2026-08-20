'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicNetworkStats } from '@eveider/data-access';
import styles from './home.module.css';

function formatCount(value: number) {
  return new Intl.NumberFormat('fr-CD').format(Math.max(0, Math.round(value)));
}

function useCountTo(target: number, durationMs: number) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const from = valueRef.current;
    const to = target;
    if (from === to) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || durationMs <= 0) {
      valueRef.current = to;
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        valueRef.current = to;
        setValue(to);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

export function MissionBannerCounts({ stats }: { stats: PublicNetworkStats }) {
  const kolwezi = useCountTo(stats.kolweziLockers, 900);
  const lualaba = useCountTo(stats.lualabaLockers, 900);
  const parcels = useCountTo(stats.parcelsHandled, 1400);

  return (
    <section className={styles.mission} aria-label="Le réseau Eveider en chiffres">
      <div className={styles.shell}>
        <div className={styles.missionGrid}>
          <p className={styles.missionItem}>
            <strong>{formatCount(kolwezi)}</strong>
            <span>Casiers à Kolwezi</span>
          </p>
          <p className={styles.missionItem}>
            <strong>{formatCount(lualaba)}</strong>
            <span>Casiers au Lualaba</span>
          </p>
          <p className={styles.missionItem} aria-live="polite">
            <strong>{formatCount(parcels)}</strong>
            <span>Colis traités</span>
          </p>
        </div>
      </div>
    </section>
  );
}
