import { createRepositories } from '@eveider/data-access';
import { requireBusinessPageContext } from '@/server/business';
import { PageFrame } from '@eveider/ui';
import { colors, webCardStyle } from '@eveider/config-ui';

export default async function BusinessProfilePage() {
  const { profile, ctx } = await requireBusinessPageContext();
  const { businesses } = createRepositories();
  const business = await businesses.findById(ctx, profile.businessId);

  function formatDateTime(date: Date | null) {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-CD', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  return (
    <PageFrame
      title="Mon profil entreprise"
      description="Gérez les informations de votre profil utilisateur et de votre entreprise."
      breadcrumbs={[
        { label: 'Entreprises', href: '/entreprise/tableau-de-bord' },
        { label: 'Mon profil' },
      ]}
    >
      <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* User Card */}
        <section
          style={{
            ...webCardStyle,
            padding: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
            Informations de l'utilisateur
          </h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>NOM COMPLET</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{profile.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>EMAIL</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{profile.email ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>RÔLE SAAS</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>Entreprise ({profile.role})</dd>
            </div>
          </dl>
        </section>

        {/* Business Card */}
        {business && (
          <section
            style={{
              ...webCardStyle,
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
              Informations sur l'entreprise
            </h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>NOM DE L'ENTREPRISE</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.name}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>STATUT COMPTE</dt>
                <dd style={{ margin: '0.25rem 0 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: business.status === 'active' ? 'rgba(9, 212, 11, 0.1)' : 'rgba(255, 184, 0, 0.1)',
                      color: business.status === 'active' ? colors.success : colors.warning,
                    }}
                  >
                    {business.status.toUpperCase()}
                  </span>
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>CODE D&apos;ACCÈS EVEIDER</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {business.accessCode ?? '—'}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>EMAIL CONTACT</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.contactEmail ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>TÉLÉPHONE CONTACT</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.contactPhone ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>TYPE D'ENTREPRISE</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.businessType ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>INDUSTRIE</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.industry ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>NUMÉRO RCCM</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.rccmNumber ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>NUMÉRO NIF</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{business.nifNumber ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>DATE DE CRÉATION DU COMPTE</dt>
                <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{formatDateTime(business.createdAt)}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </PageFrame>
  );
}
