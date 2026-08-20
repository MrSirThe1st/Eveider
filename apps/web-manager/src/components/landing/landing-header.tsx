'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './landing.module.css';

const NAV = [
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#entreprises', label: 'Entreprises' },
  { href: '#casiers', label: 'Casiers' },
  { href: '#a-propos', label: 'À propos' },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`${styles.wrap} ${styles.headerWrap}`}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="Eveider, accueil">
            <img
              src="/landing/eveider_logo.png"
              alt=""
              width={66}
              height={44}
              className={styles.brandMark}
            />
            <span className={styles.brandName}>Eveider</span>
          </Link>

          <nav
            id="landing-mobile-nav"
            className={open ? `${styles.nav} ${styles.navOpen}` : styles.nav}
            aria-label="Sections"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/suivi" className={`${styles.navLink} ${styles.navLinkMobile}`} onClick={() => setOpen(false)}>
              Suivre un colis
            </Link>
            <Link href="/connexion" className={`${styles.navLink} ${styles.navLinkMobile}`} onClick={() => setOpen(false)}>
              Se connecter
            </Link>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/suivi" className="nb-btn nb-btn-ghost nb-btn--sm">
              Suivre un colis
            </Link>
            <Link href="/connexion" className="nb-btn nb-btn-secondary nb-btn--sm">
              Se connecter
            </Link>
            <Link href="/inscription" className="nb-btn nb-btn-primary nb-btn--sm">
              Créer un compte
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={open}
              aria-controls="landing-mobile-nav"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                {open ? (
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 5h12M3 9h12M3 13h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
