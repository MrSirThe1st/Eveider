import styles from './landing.module.css';
import { LockerVisual } from './locker-visual';

export function LockerSection() {
  return (
    <section id="casiers" className={styles.section}>
      <div className={`${styles.wrap} ${styles.productHero}`}>
        <LockerVisual variant="unit" caption="Casiers de colis" />
        <div className={styles.productCopy}>
          <p className={styles.kicker}>Le casier</p>
          <h2 className={styles.title}>Dépôt et retrait, sur place.</h2>
          <p className={styles.lead}>
            Le chauffeur Eveider dépose le colis. Le destinataire l’ouvre avec un code de retrait.
          </p>
          <ul className={styles.plainList}>
            <li>Accès par code de retrait</li>
            <li>Compartiments petit, moyen et grand</li>
            <li>Casiers Eveider à Kinshasa</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
