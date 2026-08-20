import Link from 'next/link';
import { ManageCookiesButton } from '@/components/cookies/manage-cookies-button';
import styles from './landing.module.css';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrandRow}>
              <img
                src="/landing/eveider_logo.png"
                alt=""
                width={66}
                height={44}
                className={styles.footerLogo}
              />
              <p className={styles.footerBrand}>Eveider</p>
            </div>
            <p className={styles.footerNote}>
              Livraison et retrait de colis par casiers, à Kinshasa.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h2>Produit</h2>
            <ul>
              <li>
                <Link href="/#comment-ca-marche">Comment ça marche</Link>
              </li>
              <li>
                <Link href="/#entreprises">Entreprises</Link>
              </li>
              <li>
                <Link href="/#casiers">Casiers</Link>
              </li>
              <li>
                <Link href="/suivi">Suivre un colis</Link>
              </li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h2>Compte</h2>
            <ul>
              <li>
                <Link href="/connexion">Se connecter</Link>
              </li>
              <li>
                <Link href="/inscription">Créer un compte</Link>
              </li>
              <li>
                <Link href="/#faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h2>Légal</h2>
            <ul>
              <li>
                <Link href="/cookies">Cookies</Link>
              </li>
              <li>
                <ManageCookiesButton variant="footer" />
              </li>
            </ul>
          </div>
        </div>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} Eveider. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
