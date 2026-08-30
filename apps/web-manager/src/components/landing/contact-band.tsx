import Link from 'next/link';
import styles from './home.module.css';

export function ContactBand() {
  return (
    <section id="entreprises" className={styles.contact}>
      <div className={styles.shell}>
        <div className={styles.contactPanel}>
          <div className={styles.contactCopy}>
            <h2 className={styles.display}>Rejoindre le réseau pour envoyer des colis.</h2>
            <p>
              Inscrivez votre activité, puis envoyez des colis vers un casier. Envoyer vos
              pièces n’est pas obligatoire.
            </p>
          </div>
          <div className={styles.contactActions}>
            <Link href="/inscription" className="nb-btn nb-btn-primary">
              Créer un compte
            </Link>
            <Link href="/connexion" className="nb-btn nb-btn-secondary">
              Se connecter
            </Link>
            <Link href="/suivi" className="nb-btn nb-btn-ghost">
              Suivre un colis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
