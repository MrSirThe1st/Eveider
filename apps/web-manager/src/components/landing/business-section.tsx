import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';

export function BusinessSection() {
  return (
    <section id="entreprises" className={`${styles.split} ${styles.splitMuted}`}>
      <div className={styles.splitCopy}>
        <p className={styles.kicker}>Entreprises</p>
        <h2 className={styles.title}>Envoyez vos colis vers un casier Eveider.</h2>
        <p className={styles.lead}>
          Créez un colis, indiquez le destinataire, choisissez un casier, puis suivez jusqu’au
          retrait.
        </p>
        <ul className={styles.plainList}>
          <li>Créer un colis</li>
          <li>Choisir un casier à Kinshasa</li>
          <li>Suivre la livraison</li>
        </ul>
        <Link href="/inscription" className="nb-btn nb-btn-primary">
          Créer un compte
        </Link>
      </div>
      <div className={styles.splitPhoto}>
        <Image
          src="/landing/shop.jpg"
          alt="Point de vente, là où les colis partent vers un casier"
          fill
          sizes="(max-width: 960px) 100vw, 50vw"
        />
      </div>
    </section>
  );
}
