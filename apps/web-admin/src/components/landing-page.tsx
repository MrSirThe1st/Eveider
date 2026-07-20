'use client';

import { colors, radius, shadows, spacing, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

const NAV_LINKS = [
  { href: '#suivi', label: 'SUIVRE UN COLIS' },
  { href: '#comment-ca-marche', label: 'COMMENT ÇA MARCHE' },
  { href: '#solutions', label: 'SOLUTIONS' },
  { href: '#application', label: 'APPLICATION' },
] as const;

const ACCOUNT_MENU = [
  {
    href: '/connexion',
    label: 'ENTREPRISE',
    description: 'Portail commerces — dépôt et suivi des colis',
  },
  {
    href: '/connexion',
    label: 'ADMINISTRATION',
    description: 'Supervision du réseau et des opérations',
  },
  {
    href: '/connexion',
    label: 'COURSIER',
    description: 'Connexion web (compte coursier · app mobile)',
  },
  {
    href: '/connexion',
    label: 'CLIENT',
    description: 'Connexion web (compte client · app mobile)',
  },
] as const;

const STEPS = [
  { num: '01', title: 'DÉPÔT', body: 'Le commerce dépose le colis dans le réseau Eveider.' },
  { num: '02', title: 'TRANSIT', body: 'Le coursier livre le colis au casier connecté le plus proche.' },
  { num: '03', title: 'RETRAIT', body: 'Le client reçoit un code PIN et retire son colis 24/7.' },
] as const;

const SOLUTIONS = [
  {
    tag: 'B2B',
    title: 'POUR LES ENTREPRISES',
    body: 'Déposez des colis, suivez les livraisons et offrez un retrait sécurisé en casier à vos clients.',
  },
  {
    tag: 'CLIENT',
    title: 'POUR LES CLIENTS',
    body: 'Suivez votre colis, recevez votre code PIN et retirez-le quand vous voulez, sans attendre le livreur.',
  },
  {
    tag: 'OPS',
    title: 'POUR LES OPÉRATIONS',
    body: 'Supervisez le réseau, gérez les casiers, les coursiers et les incidents depuis un seul portail.',
  },
] as const;

const FOOTER_COLUMNS = [
  {
    title: 'PRODUIT',
    links: [
      { href: '#suivi', label: 'Suivre un colis' },
      { href: '#comment-ca-marche', label: 'Comment ça marche' },
      { href: '#solutions', label: 'Solutions' },
      { href: '#application', label: 'Application mobile' },
    ],
  },
  {
    title: 'ESPACE',
    links: [
      { href: '/connexion', label: 'Connexion entreprise' },
      { href: '/inscription', label: 'Inscription entreprise' },
      { href: '/connexion', label: 'Administration' },
      { href: '/connexion', label: 'Coursier / Client' },
    ],
  },
  {
    title: 'RÉSEAU',
    links: [
      { href: '#suivi', label: 'Casiers Kinshasa' },
      { href: '#application', label: 'Statut du système' },
    ],
  },
] as const;

export function LandingPage() {
  const [trackingRef, setTrackingRef] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const accountMenuId = useId();
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function handleTrack(event: React.FormEvent) {
    event.preventDefault();
    const ref = trackingRef.trim();
    if (ref) {
      window.location.href = `/connexion?ref=${encodeURIComponent(ref)}`;
      return;
    }
    window.location.href = '/connexion';
  }

  function closeMenus() {
    setAccountOpen(false);
    setMobileNavOpen(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background, display: 'flex', flexDirection: 'column' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .lp-nav-link {
              color: ${colors.secondary};
              text-decoration: none;
              font-size: 0.6875rem;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 0.5rem 0;
              border-bottom: 2px solid transparent;
            }
            .lp-nav-link:hover {
              border-bottom-color: ${colors.primary};
            }
            .lp-footer-link {
              color: ${colors.textMuted};
              text-decoration: none;
              font-size: 0.875rem;
              font-weight: 500;
              line-height: 1.8;
              display: block;
            }
            .lp-footer-link:hover {
              color: ${colors.secondary};
            }
            .lp-account-item {
              display: block;
              padding: 0.875rem 1rem;
              text-decoration: none;
              color: ${colors.secondary};
              border-bottom: 2px solid ${colors.border};
            }
            .lp-account-item:last-child {
              border-bottom: none;
            }
            .lp-account-item:hover {
              background: ${colors.background};
            }
            @media (max-width: 860px) {
              .lp-desktop-nav { display: none !important; }
              .lp-mobile-toggle { display: inline-flex !important; }
            }
            @media (min-width: 861px) {
              .lp-mobile-toggle { display: none !important; }
              .lp-mobile-panel { display: none !important; }
            }
          `,
        }}
      />

      {/* Top navigation */}
      <header
        style={{
          borderBottom: `2px solid ${colors.border}`,
          background: colors.surface,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '0.875rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <a href="#suivi" onClick={closeMenus} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <span
              style={{
                background: colors.secondary,
                color: colors.primary,
                padding: '0.3rem 0.5rem',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                borderRadius: 4,
                border: `2px solid ${colors.border}`,
              }}
            >
              EV
            </span>
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: colors.secondary,
              }}
            >
              EVEIDER
            </span>
          </a>

          <nav className="lp-desktop-nav" aria-label="Navigation principale" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="lp-nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div ref={accountRef} style={{ position: 'relative' }} className="lp-desktop-nav">
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
                className="nb-btn nb-btn-secondary"
                style={{ height: 40, fontSize: '0.75rem', gap: '0.5rem' }}
              >
                CONNEXION
                <span aria-hidden style={{ fontSize: '0.65rem' }}>{accountOpen ? '▲' : '▼'}</span>
              </button>

              {accountOpen ? (
                <div
                  id={accountMenuId}
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 0.5rem)',
                    width: 300,
                    background: colors.surface,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radius.card,
                    boxShadow: shadows.hard,
                    overflow: 'hidden',
                    zIndex: 120,
                  }}
                >
                  {ACCOUNT_MENU.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      className="lp-account-item"
                      onClick={() => setAccountOpen(false)}
                    >
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                        {item.label}
                      </span>
                      <span style={{ display: 'block', marginTop: 4, fontSize: '0.75rem', fontWeight: 500, color: colors.textMuted }}>
                        {item.description}
                      </span>
                    </Link>
                  ))}
                  <div style={{ padding: '0.75rem 1rem', background: colors.background, borderTop: `2px solid ${colors.border}` }}>
                    <Link
                      href="/inscription"
                      onClick={() => setAccountOpen(false)}
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: colors.secondary,
                        textDecoration: 'none',
                      }}
                    >
                      NOUVELLE ENTREPRISE ? S&apos;INSCRIRE →
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/inscription"
              className="nb-btn nb-btn-primary lp-desktop-nav"
              style={{ height: 40, fontSize: '0.75rem' }}
            >
              S&apos;INSCRIRE
            </Link>

            <button
              type="button"
              className="lp-mobile-toggle"
              aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              style={{
                display: 'none',
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${colors.border}`,
                borderRadius: radius.button,
                background: colors.surface,
                boxShadow: shadows.hard,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        {mobileNavOpen ? (
          <div
            className="lp-mobile-panel"
            style={{
              borderTop: `2px solid ${colors.border}`,
              background: colors.surface,
              padding: '1rem 1.5rem 1.25rem',
            }}
          >
            <nav aria-label="Navigation mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="lp-nav-link"
                  onClick={closeMenus}
                  style={{ borderBottom: `2px solid ${colors.border}`, padding: '0.875rem 0' }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <p
              style={{
                margin: '1.25rem 0 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: colors.textMuted,
              }}
            >
              CONNEXION
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ACCOUNT_MENU.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenus}
                  style={{
                    ...webCardStyle,
                    padding: '0.875rem 1rem',
                    textDecoration: 'none',
                    color: colors.secondary,
                    boxShadow: 'none',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                    {item.label}
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: '0.75rem', color: colors.textMuted, fontWeight: 500 }}>
                    {item.description}
                  </span>
                </Link>
              ))}
              <Link
                href="/inscription"
                onClick={closeMenus}
                className="nb-btn nb-btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', height: 44, fontSize: '0.75rem' }}
              >
                S&apos;INSCRIRE ENTREPRISE
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero + Tracking */}
        <section id="suivi" style={{ background: colors.surface, borderBottom: `2px solid ${colors.border}` }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '3.5rem 1.5rem 4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colors.primary,
                  border: `2px solid ${colors.border}`,
                  display: 'inline-block',
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                Réseau de casiers logistiques · Kinshasa, RDC
              </p>
            </div>

            <h1
              style={{
                margin: '0 0 1rem',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 700,
                letterSpacing: '0.02em',
                lineHeight: 1.05,
                textTransform: 'uppercase',
                color: colors.secondary,
                maxWidth: 640,
              }}
            >
              RETIREZ VOS COLIS.
              <br />
              À TOUT MOMENT.
            </h1>
            <p
              style={{
                margin: '0 0 2.5rem',
                fontWeight: 500,
                lineHeight: 1.6,
                fontSize: '1.0625rem',
                color: colors.textMuted,
                maxWidth: 520,
              }}
            >
              Casiers sécurisés à travers Kinshasa. Suivez votre colis, recevez votre code PIN et retirez-le quand vous voulez.
            </p>

            <form
              onSubmit={handleTrack}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                maxWidth: 640,
                border: `2px solid ${colors.border}`,
                borderRadius: radius.card,
                overflow: 'hidden',
                boxShadow: shadows.hard,
                background: colors.surface,
              }}
            >
              <input
                type="text"
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
                placeholder="Numéro de suivi ou référence colis"
                aria-label="Numéro de suivi"
                style={{
                  flex: '1 1 200px',
                  minWidth: 0,
                  height: spacing.buttonHeight,
                  padding: '0 1.25rem',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: colors.secondary,
                  background: 'transparent',
                }}
              />
              <button
                type="submit"
                className="nb-btn nb-btn-primary"
                style={{
                  flex: '1 1 auto',
                  height: spacing.buttonHeight,
                  borderRadius: 0,
                  border: 'none',
                  borderLeft: `2px solid ${colors.border}`,
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                  padding: '0 1.5rem',
                }}
              >
                SUIVRE MON COLIS
              </button>
            </form>
          </div>
        </section>

        {/* How it works */}
        <section id="comment-ca-marche" style={{ maxWidth: 1080, margin: '0 auto', padding: '3.5rem 1.5rem' }}>
          <h2 style={sectionTitleStyle}>COMMENT ÇA MARCHE</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {STEPS.map((step) => (
              <article key={step.num} style={{ ...webCardStyle, padding: '1.5rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '0.25rem 0.5rem',
                    background: colors.secondary,
                    color: colors.primary,
                    marginBottom: '1rem',
                  }}
                >
                  {step.num}
                </span>
                <h3
                  style={{
                    margin: '0 0 0.5rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: colors.textMuted, lineHeight: 1.5 }}>
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Solutions — marketing, no login clutter */}
        <section
          id="solutions"
          style={{
            background: colors.surface,
            borderTop: `2px solid ${colors.border}`,
            borderBottom: `2px solid ${colors.border}`,
            padding: '3.5rem 1.5rem',
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h2 style={sectionTitleStyle}>SOLUTIONS</h2>
            <p style={{ margin: '-1rem 0 2rem', fontWeight: 500, color: colors.textMuted, maxWidth: 520, lineHeight: 1.5 }}>
              Un seul réseau de casiers pour commerces, clients et équipes opérations.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {SOLUTIONS.map((item) => (
                <article key={item.title} style={{ ...webCardStyle, padding: '1.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: colors.textMuted,
                    }}
                  >
                    [ {item.tag} ]
                  </span>
                  <h3
                    style={{
                      margin: '1rem 0 0.75rem',
                      fontSize: '1.0625rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: colors.textMuted, lineHeight: 1.5, fontWeight: 500 }}>
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile app */}
        <section id="application" style={{ maxWidth: 1080, margin: '0 auto', padding: '3.5rem 1.5rem 4rem' }}>
          <h2 style={sectionTitleStyle}>APPLICATION MOBILE</h2>
          <div
            style={{
              ...webCardStyle,
              padding: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '2rem',
              alignItems: 'center',
            }}
          >
            <div>
              <h3
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                CLIENTS & COURSIERS
              </h3>
              <p style={{ margin: 0, fontWeight: 500, color: colors.textMuted, lineHeight: 1.55 }}>
                Suivez vos colis, générez votre code PIN, ou gérez vos trajets de livraison depuis l&apos;application Eveider.
                Les comptes client et coursier sont conçus pour le mobile.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/connexion" className="nb-btn nb-btn-primary" style={{ height: 48, fontSize: '0.75rem' }}>
                OUVRIR LA CONNEXION
              </Link>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, textAlign: 'center' }}>
                Compte mobile · client ou coursier
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: `2px solid ${colors.border}`,
          background: colors.secondary,
          color: colors.surface,
          padding: '3rem 1.5rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '2rem',
              marginBottom: '2.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span
                  style={{
                    background: colors.primary,
                    color: colors.secondary,
                    padding: '0.25rem 0.45rem',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    border: `2px solid ${colors.surface}`,
                  }}
                >
                  EV
                </span>
                <span style={{ fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.9375rem' }}>EVEIDER</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5, opacity: 0.75, maxWidth: 220 }}>
                Réseau de casiers logistiques sécurisés à Kinshasa.
              </p>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                  }}
                >
                  {column.title}
                </p>
                {column.links.map((link) => (
                  <a
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="lp-footer-link"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: `2px solid rgba(255,255,255,0.2)`,
              paddingTop: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.65 }}>
              © {new Date().getFullYear()} EVEIDER TECHNOLOGIES. TOUS DROITS RÉSERVÉS.
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: colors.primary,
                    border: `1px solid ${colors.surface}`,
                  }}
                />
                SYSTÈME EN LIGNE
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.65 }}>
                3 STATIONS CASIERS CONNECTÉES
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 2rem',
  fontSize: '1.25rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.secondary,
};
