import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import cookieStyles from '@/components/cookies/cookies.module.css';
import styles from '@/components/landing/landing.module.css';
import { ManageCookiesButton } from '@/components/cookies/manage-cookies-button';

export const metadata = {
  title: 'Cookies',
  description: 'Comment Eveider utilise les cookies nécessaires et de préférence.',
};

export default function CookiesPage() {
  return (
    <div className={`${styles.page} ${GeistSans.className}`}>
      <LandingHeader />
      <main id="contenu-principal" className={styles.wrap}>
        <article className={cookieStyles.policy}>
          <h1>Cookies sur Eveider</h1>
          <p className={cookieStyles.updated}>Dernière mise à jour : 20 août 2026</p>

          <p>
            Cette page explique les cookies utilisés par le site et le portail Eveider
            (livraison et retrait de colis par casiers, à Kinshasa). Nous n’utilisons aujourd’hui
            que des cookies de premier parti, en nombre limité.
          </p>

          <h2>Qu’est-ce qu’un cookie ?</h2>
          <p>
            Un cookie est un petit fichier enregistré sur votre appareil. Il permet au service de
            vous reconnaître d’une visite à l’autre, par exemple pour rester connecté ou pour
            mémoriser un choix d’affichage.
          </p>

          <h2>Cookies nécessaires</h2>
          <p>
            Ces cookies sont indispensables au fonctionnement d’Eveider. Ils ne peuvent pas être
            désactivés depuis le bandeau, car sans eux le service ne fonctionne pas correctement.
          </p>
          <ul>
            <li>
              <strong>Session Supabase</strong> — maintient votre connexion au portail (compte
              entreprise ou administration). Durée : selon la session d’authentification.
            </li>
            <li>
              <strong>eveider_cookie_consent</strong> — mémorise vos choix de cookies. Durée : 180
              jours.
            </li>
          </ul>
          <p>
            Des cookies de sécurité liés à la session peuvent aussi être déposés par
            l’infrastructure d’authentification.
          </p>

          <h2>Cookies de préférence</h2>
          <p>
            Déposés seulement si vous les acceptez. Ils améliorent l’expérience, sans être
            requis pour utiliser Eveider.
          </p>
          <ul>
            <li>
              <strong>eveider_theme</strong> — mémorise l’affichage clair, sombre, ou automatique
              (réglages de l’appareil). Durée : 180 jours. Sans ce cookie, le thème peut suivre
              l’appareil le temps de la visite, sans être conservé.
            </li>
          </ul>

          <h2>Cookies d’analyse et cookies tiers</h2>
          <p>
            Eveider n’utilise pas, à ce jour, d’outils d’audience tels que Google Analytics, Meta
            Pixel ou PostHog, ni de cookies publicitaires. Si cela change, cette page et le
            bandeau seront mis à jour, et ces cookies ne seront chargés qu’avec votre accord
            lorsque la réglementation l’exige.
          </p>

          <h2>Comment modifier votre consentement</h2>
          <p>
            Vous pouvez changer d’avis à tout moment via <ManageCookiesButton variant="inline" /> ou
            le lien « Gérer les cookies » en bas de page. « Tout refuser » n’empêche pas l’usage du
            service : seuls les cookies nécessaires restent actifs, et le cookie de thème est alors
            supprimé.
          </p>

          <h2>Contact</h2>
          <p>
            Pour une question sur les cookies ou vos données :{' '}
            <a href="tel:+243810000000">+243 81 000 0000</a>, ou via{' '}
            <Link href="/#entreprises">la page d’accueil</Link>.
          </p>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
