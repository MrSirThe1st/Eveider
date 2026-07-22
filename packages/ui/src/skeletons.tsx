import { colors, radius } from '@eveider/config-ui';

function SkeletonBlock({
  width,
  height,
  borderRadius = 6,
}: {
  width: number | string;
  height: number | string;
  borderRadius?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${colors.borderSubtle} 25%, ${colors.background} 50%, ${colors.borderSubtle} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'eveider-shimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

/** Table/list page skeleton — sidebar sections with rows. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy aria-label="Chargement…" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '1rem',
        }}
      >
        <SkeletonBlock width={280} height={28} />
        <SkeletonBlock width={120} height={36} />
      </div>
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: radius.card,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.75fr',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${colors.borderSubtle}`,
            background: colors.background,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} width="80%" height={12} borderRadius={4} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.75fr',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderBottom: row < rows - 1 ? `1px solid ${colors.borderSubtle}` : undefined,
            }}
          >
            {Array.from({ length: 5 }).map((_, col) => (
              <SkeletonBlock key={col} width={col === 0 ? '70%' : '55%'} height={14} borderRadius={4} />
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes eveider-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

/** Card list skeleton — business applications, similar dossier lists. */
export function CardListSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy aria-label="Chargement…">
      <div style={{ marginBottom: '1.5rem' }}>
        <SkeletonBlock width={320} height={28} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radius.card,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <SkeletonBlock width={180} height={20} />
                <SkeletonBlock width={88} height={22} borderRadius={4} />
              </div>
              <SkeletonBlock width="85%" height={14} />
              <div style={{ marginTop: '0.35rem' }}>
                <SkeletonBlock width="60%" height={12} />
              </div>
            </div>
            <SkeletonBlock width={160} height={36} borderRadius={6} />
          </div>
        ))}
      </div>
      <style>{`@keyframes eveider-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

/** Dashboard overview — KPI row + chart blocks + table. */
export function DashboardOverviewSkeleton() {
  return (
    <div aria-busy aria-label="Chargement du tableau de bord…">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radius.card,
              padding: '1.25rem',
            }}
          >
            <SkeletonBlock width="60%" height={12} borderRadius={4} />
            <div style={{ marginTop: '0.75rem' }}>
              <SkeletonBlock width="45%" height={28} />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radius.card,
              padding: '1.25rem',
              minHeight: 200,
            }}
          >
            <SkeletonBlock width={160} height={16} />
            <div style={{ marginTop: '1.25rem' }}>
              <SkeletonBlock width="100%" height={120} borderRadius={8} />
            </div>
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} />
      <style>{`@keyframes eveider-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
