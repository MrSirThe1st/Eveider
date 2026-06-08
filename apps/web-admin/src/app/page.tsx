import { colors } from '@eveider/config-ui';

export default function AdminHomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background,
      }}
    >
      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '2rem 3rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: colors.secondary,
          }}
        >
          EVEIDER ADMIN
        </p>
        <h1
          style={{
            margin: '0.75rem 0 0',
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Tableau de bord opérations
        </h1>
        <p style={{ margin: '1rem 0 0', fontWeight: 500, color: colors.secondary }}>
          Monorepo initialisé — prêt pour le développement.
        </p>
      </section>
    </main>
  );
}
