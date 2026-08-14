import { colors, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { LandingTrackingForm } from '@/components/landing-tracking-form';

const GUIDE_STEPS = [
  {
    step: '01',
    title: 'Expédition',
    description:
      'Une entreprise enregistrée crée un envoi, choisit un point Eveider et invite le destinataire par WhatsApp ou lien de suivi.',
  },
  {
    step: '02',
    title: 'Livraison au casier',
    description:
      'Le coursier dépose le colis dans le compartiment réservé. Le statut passe à « prêt pour retrait ».',
  },
  {
    step: '03',
    title: 'Notification & paiement',
    description:
      'Le client reçoit une notification et paie les frais de retrait si nécessaire, via mobile money ou l’application.',
  },
  {
    step: '04',
    title: 'Retrait PIN',
    description:
      'Le client utilise son code PIN unique pour ouvrir le casier et retirer son colis en toute sécurité.',
      'Un coursier assigné dépose le colis dans le compartiment réservé. Le statut passe à « prêt pour retrait ».',
  },
  {
    step: '03',
    title: 'Suivi sans compte',
    description:
      'Le destinataire consulte son colis sur la page Suivi avec le numéro de suivi ou son téléphone — aucune inscription requise.',
  },
  {
    step: '04',
    title: 'Retrait sécurisé',
    description:
      'Après paiement mobile money si nécessaire, le code PIN s’affiche pour ouvrir le casier et retirer le colis.',
  },
] as const;

export function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: colors.background, position: 'relative', overflowX: 'hidden' }}>
      {/* Dynamic styling for interactive hover states and grid telemetry */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tech-grid {
          background-image: radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px);
          background-size: 24px 24px;
        }
        .hero-title {
          font-family: var(--font-family);
          background: linear-gradient(135deg, #121212 0%, #444444 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .card-hover {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-6px);
          border-color: #09D40B !important;
          box-shadow: 0 16px 32px rgba(18, 18, 18, 0.05);
        }
        .btn {
          transition: all 0.2s ease-in-out;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.8125rem;
          letter-spacing: 0.05em;
          border-radius: 8px;
        }
        .btn-primary {
          background: #121212;
          color: #FFFFFF;
          border: 1px solid #121212;
        }
        .btn-primary:hover {
          background: #09D40B;
          border-color: #09D40B;
          color: #121212;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(9, 212, 11, 0.15);
        }
        .btn-secondary {
          background: transparent;
          color: #121212;
          border: 1px solid #E7EAEC;
        }
        .btn-secondary:hover {
          background: #F8F9FA;
          border-color: #121212;
          transform: translateY(-1px);
        }
        .pulse-glow {
          box-shadow: 0 0 0 0 rgba(9, 212, 11, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(9, 212, 11, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(9, 212, 11, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(9, 212, 11, 0);
          }
        }
      `}} />

      {/* Header */}
      <header
        style={{
          borderBottom: `2px solid ${colors.border}`,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '1rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              background: '#121212',
              color: '#09D40B',
              padding: '0.25rem 0.5rem',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              borderRadius: 4
            }}>EV</span>
            <p
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                color: '#121212',
              }}
            >
              EVEIDER
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/suivi"
              className="btn btn-secondary"
              style={{ height: 38, padding: '0 1rem' }}
            >
              SUIVRE UN COLIS
            </Link>
            <Link
              href="/connexion"
              className="btn btn-secondary"
              style={{ height: 38, padding: '0 1rem' }}
            >
              SE CONNECTER
            </Link>
            <Link
              href="/inscription"
              className="btn btn-primary"
              style={{ height: 38, padding: '0 1.25rem' }}
            >
              S&apos;INSCRIRE
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="tech-grid" style={{ position: 'relative', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
          
          {/* Top Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span className="pulse-glow" style={{ width: 8, height: 8, borderRadius: '50%', background: '#09D40B', display: 'inline-block' }}></span>
            <p
              style={{
                margin: 0,
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#64748B',
                textTransform: 'uppercase',
              }}
            >
              Réseau de casiers logistiques · Kinshasa, RDC
            </p>
          </div>

          {/* Hero Content */}
          <section style={{ maxWidth: 780, marginBottom: '4rem' }}>
            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#121212', color: '#09D40B', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              EVEIDER BUSINESS
            </div>
            <h1
              className="hero-title"
              style={{
                margin: '0 0 1.5rem',
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textTransform: 'uppercase',
              }}
            >
              LIVRAISON INTELLIGENTE ET VERIFICATION BUSINESS.
            </h1>
            <p style={{ margin: '0 0 1.5rem', fontWeight: 600, fontSize: '1.25rem', color: '#1E293B', lineHeight: 1.4 }}>
              Vous vendez en ligne (e-commerce) ? Vous gérez des livraisons ?<br />
              Expédiez vos produits à travers le Congo avec Eveider.
            </p>
            <p style={{ margin: '0 0 1.5rem', fontWeight: 500, lineHeight: 1.6, fontSize: '1rem', color: '#475569' }}>
              De l&apos;inscription aux casiers connectés 24/7 en passant par la vérification KYC rapide, accédez à la première infrastructure logistique unifiée pour marchands et grandes entreprises.
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.08em', color: '#64748B' }}>
                SUIVI CLIENT — SANS COMPTE
              </p>
              <LandingTrackingForm />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/inscription" className="btn btn-primary" style={{ height: 48, padding: '0 1.75rem', fontSize: '0.875rem' }}>
                START SHIPPING WITH EVEIDER →
              </Link>
              <Link href="/connexion" className="btn btn-secondary" style={{ height: 48, padding: '0 1.5rem', fontSize: '0.875rem' }}>
                LOGIN
              </Link>
            </div>
          </section>

          {/* Guest tracking — no login required */}
          <section
            style={{
              ...webCardStyle,
              padding: '2rem',
              marginBottom: '3rem',
              borderColor: '#09D40B',
            }}
          >
            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#F0FDF4', color: '#166534', borderRadius: 6, fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              SUIVI CLIENT
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#121212' }}>
              Suivre un colis sans compte
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontWeight: 500, lineHeight: 1.6, fontSize: '0.9375rem', color: '#475569', maxWidth: 640 }}>
              Entrez votre numéro de suivi Eveider pour consulter le statut, payer les frais de retrait si nécessaire et obtenir votre code PIN.
            </p>
            <LandingTrackingForm />
            <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
              Vous pouvez aussi{' '}
              <Link href="/suivi" style={{ color: '#121212', fontWeight: 600 }}>
                ouvrir la page de suivi complète
              </Link>{' '}
              pour rechercher par téléphone.
            </p>
          </section>

          {/* How it works */}
          <section style={{ marginBottom: '3rem' }}>
            <p
              style={{
                margin: '0 0 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#64748B',
                textTransform: 'uppercase',
              }}
            >
              Comment ça marche
            </p>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#121212' }}>
              De l&apos;expédition au retrait en quatre étapes
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {GUIDE_STEPS.map((item) => (
                <article
                  key={item.step}
                  style={{
                    ...webCardStyle,
                    padding: '1.5rem',
                    minHeight: 180,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      color: '#09D40B',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {item.step}
                  </span>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.0625rem', fontWeight: 700, color: '#121212' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.55 }}>
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Cards Grid */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Card 1: Business */}
            <article
              className="card-hover"
              style={{
                ...webCardStyle,
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 300,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#09D40B' }}>[ EVEIDER BUSINESS ]</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.5rem', background: '#F0FDF4', color: '#166534', borderRadius: 4 }}>ACTIF</span>
              </div>
              <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.25rem', fontWeight: 700, color: '#121212' }}>Portail Entreprises & Vendeurs</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, flex: 1 }}>
                Entreprises enregistrées, vendeurs informels ou grands partenaires : complétez votre vérification et expédiez vos colis partout à Kinshasa.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <Link href="/inscription" className="btn btn-primary" style={{ flex: 1, height: 40, borderRadius: 12 }}>
                  Créer un compte
                </Link>
                <Link href="/connexion" className="btn btn-secondary" style={{ flex: 1, height: 40, borderRadius: 12 }}>
                  Se connecter
                </Link>
              </div>
            </article>

            {/* Card 2: Operations */}
            <article
              className="card-hover"
              style={{
                ...webCardStyle,
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 300,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#09D40B' }}>[ OPS ]</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.5rem', background: '#F0FDF4', color: '#166534', borderRadius: 4 }}>CONTRÔLE</span>
              </div>
              <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.25rem', fontWeight: 700, color: '#121212' }}>Administration</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, flex: 1 }}>
                Supervisez le réseau, gérez les utilisateurs, configurez les casiers et résolvez les incidents logistiques.
              </p>
              <div style={{ marginTop: '2rem' }}>
                <Link href="/connexion" className="btn btn-primary" style={{ width: '100%', height: 40, borderRadius: 12 }}>
                  Accéder au portail
                </Link>
              </div>
            </article>

            {/* Card 3: Courier */}
            <article
              className="card-hover"
              style={{
                ...webCardStyle,
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 300,
                opacity: 0.9,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#64748B' }}>[ M-APP ]</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.5rem', background: '#F1F5F9', color: '#475569', borderRadius: 4 }}>BETA</span>
              </div>
              <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.25rem', fontWeight: 700, color: '#1E293B' }}>Application Coursier</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5, flex: 1 }}>
                Consultez vos trajets assignés, scannez les colis à déposer et confirmez la fermeture des casiers.
              </p>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/connexion" className="btn btn-primary" style={{ flex: 1, minWidth: 140, height: 40, borderRadius: 12 }}>
                  Connexion coursier
                </Link>
                <span style={{ flex: 1, minWidth: 140, textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: '#94A3B8', border: '1px dashed #E2E8F0', padding: '10px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  App mobile · BETA
                </span>
              </div>
            </article>

            {/* Card 4: Customer */}
            <article
              className="card-hover"
              style={{
                ...webCardStyle,
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 300,
                opacity: 0.9,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#64748B' }}>[ M-APP ]</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.5rem', background: '#F1F5F9', color: '#475569', borderRadius: 4 }}>BETA</span>
              </div>
              <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.25rem', fontWeight: 700, color: '#1E293B' }}>Application Client</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5, flex: 1 }}>
                Suivez vos colis reçus, générez votre code PIN unique et ouvrez votre compartiment de casier en toute sécurité.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                <Link href="/suivi" className="btn btn-primary" style={{ flex: 1, minWidth: 140, height: 40, borderRadius: 12 }}>
                  Suivre un colis
                </Link>
                <span style={{ flex: 1, minWidth: 140, textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: '#94A3B8', border: '1px dashed #E2E8F0', padding: '10px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  App mobile · BETA
                </span>
              </div>
            </article>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: `2px solid ${colors.border}`,
          background: '#FFFFFF',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em' }}>
            © {new Date().getFullYear()} EVEIDER TECHNOLOGIES. TOUS DROITS RÉSERVÉS.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09D40B' }}>
              ● SYSTÈME EN LIGNE
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
              3 STATIONS CASIERS CONNECTÉES
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
