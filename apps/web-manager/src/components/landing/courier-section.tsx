import Image from 'next/image';
import styles from './landing.module.css';

export function CourierSection() {
  return (
    <section id="coursiers" className={`${styles.split} ${styles.splitReverse}`}>
      <div className={styles.splitCopy}>
        <p className={styles.kicker}>Coursiers</p>
        <h2 className={styles.title}>Déposer au casier, confirmer, continuer.</h2>
        <p className={styles.lead}>
          Le coursier reçoit la tournée, se rend au casier, dépose le colis et confirme le dépôt.
        </p>
        <ul className={styles.plainList}>
          <li>Recevoir l’assignation</li>
          <li>Aller au casier prévu</li>
          <li>Déposer et confirmer</li>
        </ul>
      </div>
      <div className={styles.splitPhoto}>
        <Image
          src="/landing/courier.jpg"
          alt="Coursier chargeant des colis"
          fill
          sizes="(max-width: 960px) 100vw, 50vw"
        />
      </div>
    </section>
  );
}
