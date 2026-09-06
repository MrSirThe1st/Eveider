'use client';

import Link from 'next/link';
import { useLayoutEffect, useState } from 'react';
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
  // Start hidden to avoid a consent flash when a decision already exists.
  // useLayoutEffect runs before paint and reveals the banner only when needed.
  const [showBanner, setShowBanner] = useState(false);

  useLayoutEffect(() => {
    const current = readBrowserConsent();
    setShowBanner(!hasAnsweredConsent(current));
    if (current?.preferences) {
      migrateLegacyThemeStorage();
    }
    return subscribeCookieSettings(() => {
      setShowBanner(true);
    });
  }, []);

  function accept() {
    saveConsent(true);
    setShowBanner(false);
  }

  function refuse() {
    saveConsent(false);
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
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
        <button type="button" className="nb-btn nb-btn-secondary nb-btn--sm" onClick={refuse}>
          Refuser
        </button>
        <button type="button" className="nb-btn nb-btn-primary nb-btn--sm" onClick={accept}>
          Accepter
        </button>
      </div>
    </div>
  );
}
