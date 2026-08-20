import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';

export function CustomerSection() {
  return (
    <section id="clients" className={`${styles.split} ${styles.splitMuted}`}>
      <div className={styles.splitCopy}>
        <p className={styles.kicker}>Clients</p>
        <h2 className={styles.title}>Suivre, puis retirer — sans compte.</h2>
        <p className={styles.lead}>
          Le destinataire reçoit le suivi, se rend au casier et ouvre le compartiment avec un PIN de
          retrait.
        </p>
        <ul className={styles.plainList}>
          <li>Notification de suivi</li>
          <li>Retrait au casier</li>
          <li>Aucun compte nécessaire</li>
        </ul>
        <Link href="/suivi" className="nb-btn nb-btn-secondary">
          Suivre un colis
        </Link>
      </div>
      <div className={styles.splitPhoto}>
        <Image
          src="/landing/pickup.jpg"
          alt="Colis prêts à être retirés"
          fill
          sizes="(max-width: 960px) 100vw, 50vw"
        />
      </div>
    </section>
  );
}
