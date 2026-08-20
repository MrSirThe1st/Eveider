import { PageFrame } from '@eveider/ui';
import { requireWebRole } from '@/lib/require-web-role';
import { webCardStyle } from '@eveider/config-ui';

export default async function AdminProfilePage() {
  const profile = await requireWebRole(['admin']);

  function formatDateTime(date: Date) {
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
      title="Mon profil"
      description="Vos informations personnelles d'administrateur."
      layout="standard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/tableau-de-bord' },
        { label: 'Mon profil' },
      ]}
    >
      <div style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>
          {profile.fullName?.toUpperCase() ?? 'ADMINISTRATEUR'}
        </h2>

        <section
          style={{
            ...webCardStyle,
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
            Détails du compte
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
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>TÉLÉPHONE</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{profile.phone ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>RÔLE</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>Administrateur</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7 }}>DATE D'INSCRIPTION</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{formatDateTime(profile.createdAt)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </PageFrame>
  );
}
