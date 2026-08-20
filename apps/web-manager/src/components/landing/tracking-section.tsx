'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import styles from './landing.module.css';

export function TrackingSection() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    router.push(`/suivi?mode=tracking&tracking=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section id="suivi" className={`${styles.bentoCard} ${styles.trackCard}`}>
      <p className={styles.kicker}>Suivi</p>
      <h2 className={styles.cardTitle}>Suivez votre colis</h2>
      <p className={styles.cardLead}>Aucun compte nécessaire.</p>
      <form className={styles.trackForm} onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="landing-tracking-number">
          Numéro de suivi
        </label>
        <input
          id="landing-tracking-number"
          className={`nb-input ${styles.trackInput}`}
          type="text"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="EVD26A7K3M2PX"
          autoComplete="off"
        />
        <button type="submit" className="nb-btn nb-btn-primary">
          Suivre
        </button>
      </form>
    </section>
  );
}
