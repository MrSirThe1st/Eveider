'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import styles from './home.module.css';

export function ProductCtaSection() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    router.push(`/suivi?mode=tracking&tracking=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className={styles.productCta} id="suivi-rapide">
      <div className={styles.shell}>
        <div className={styles.productPanel}>
          <div className={styles.productCopy}>
            <h2 className={styles.display}>
              Le réseau Eveider, <em>près de vous.</em>
            </h2>
            <p className={styles.lede}>Aucun compte nécessaire pour suivre un colis.</p>
            <form className={styles.trackForm} onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="home-tracking-number">
                Numéro de suivi
              </label>
              <input
                id="home-tracking-number"
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
          </div>
          <div className={styles.productVisual}>
            <span className={styles.productFrame} aria-hidden="true" />
            <img
              className={styles.productLocker}
              src="/landing/locker.png"
              alt="Casier intelligent Eveider"
              width={1264}
              height={842}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
