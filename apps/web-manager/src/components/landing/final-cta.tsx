import Link from 'next/link';
import styles from './landing.module.css';

export function FinalCTA() {
  return (
    <section id="entreprises" className={styles.ctaBand}>
      <p className={styles.kicker}>Création de compte</p>
      <h2 className={styles.ctaBandTitle}>Créer un compte</h2>
      <p className={styles.ctaBandLead}>
        Inscrivez votre entreprise pour expédier, ou suivez un colis sans vous inscrire.
      </p>
      <div className={styles.finalActions}>
        <Link href="/inscription" className="nb-btn nb-btn-primary">
          Créer un compte
        </Link>
        <Link href="/suivi" className="nb-btn nb-btn-secondary">
          Suivre un colis
        </Link>
      </div>
    </section>
  );
}
