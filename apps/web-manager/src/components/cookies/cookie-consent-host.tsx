'use client';

import { Modal } from '@eveider/ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CONSENT_VERSION,
  hasAnsweredConsent,
  readBrowserConsent,
  subscribeCookieSettings,
  writeBrowserConsent,
  type CookieConsent,
} from '@/lib/consent';
import { clearThemeCookie, migrateLegacyThemeStorage, persistThemeIfAllowed } from '@/lib/theme';
import styles from './cookies.module.css';

function saveConsent(preferences: boolean) {
  const consent: CookieConsent = {
    v: CONSENT_VERSION,
    preferences,
    updatedAt: new Date().toISOString(),
  };
  writeBrowserConsent(consent);
  if (preferences) {
    persistThemeIfAllowed();
    migrateLegacyThemeStorage();
  } else {
    clearThemeCookie();
  }
}

export function CookieConsentHost() {
  const [ready, setReady] = useState(false);
  const [answered, setAnswered] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    const current = readBrowserConsent();
    setAnswered(hasAnsweredConsent(current));
    setPreferences(current?.preferences === true);
    setReady(true);
    if (current?.preferences) {
      migrateLegacyThemeStorage();
    }
    return subscribeCookieSettings(() => {
      const latest = readBrowserConsent();
      setPreferences(latest?.preferences === true);
      setSettingsOpen(true);
    });
  }, []);

  function acceptAll() {
    saveConsent(true);
    setPreferences(true);
    setAnswered(true);
    setSettingsOpen(false);
  }

  function refuseOptional() {
    saveConsent(false);
    setPreferences(false);
    setAnswered(true);
    setSettingsOpen(false);
  }

  function saveChoices() {
    saveConsent(preferences);
    setAnswered(true);
    setSettingsOpen(false);
  }

  if (!ready) return null;

  return (
    <>
      {!answered && !settingsOpen ? (
        <div className={styles.banner} role="region" aria-label="Cookies" aria-live="polite">
          <div className={styles.bannerCopy}>
            <h2>Votre confidentialité compte</h2>
            <p>
              Eveider utilise des cookies nécessaires au fonctionnement du service et, avec votre
              accord, des cookies de préférence pour améliorer votre expérience.{' '}
              <Link href="/cookies">En savoir plus</Link>
            </p>
          </div>
          <div className={styles.bannerActions}>
            <button type="button" className="nb-btn nb-btn-ghost nb-btn--sm" onClick={() => setSettingsOpen(true)}>
              Gérer mes choix
            </button>
            <button type="button" className="nb-btn nb-btn-secondary nb-btn--sm" onClick={refuseOptional}>
              Refuser les optionnels
            </button>
            <button type="button" className="nb-btn nb-btn-primary nb-btn--sm" onClick={acceptAll}>
              Accepter
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Préférences de cookies"
        description="Les cookies nécessaires restent toujours actifs. Vous pouvez accepter ou refuser les cookies de préférence."
        maxWidth={560}
        footer={
          <>
            <button type="button" className="nb-btn nb-btn-ghost nb-btn--sm" onClick={refuseOptional}>
              Tout refuser
            </button>
            <button type="button" className="nb-btn nb-btn-secondary nb-btn--sm" onClick={saveChoices}>
              Enregistrer mes choix
            </button>
            <button type="button" className="nb-btn nb-btn-primary nb-btn--sm" onClick={acceptAll}>
              Tout accepter
            </button>
          </>
        }
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Description</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.cat}>Nécessaires</td>
              <td className={styles.desc}>Connexion, sécurité et fonctionnement du service</td>
              <td className={styles.state}>Toujours actifs</td>
            </tr>
            <tr>
              <td className={styles.cat}>Préférences</td>
              <td className={styles.desc}>Mémoriser vos choix, comme le thème</td>
              <td>
                <button
                  type="button"
                  className={preferences ? `${styles.switch} ${styles.switchOn}` : styles.switch}
                  aria-pressed={preferences}
                  onClick={() => setPreferences((value) => !value)}
                >
                  {preferences ? 'Activé' : 'Désactivé'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    </>
  );
}
