'use client';

import { EmptyState, IconLayout } from '@eveider/ui';
import { colors, webCardStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { LockerLayoutPreview } from '@/components/locker-layout-preview';
import type { LockerLayoutTemplateDto } from '@/server/locker-settings';

type LockerTemplateListProps = {
  templates: LockerLayoutTemplateDto[];
};

export function LockerTemplateList({ templates }: LockerTemplateListProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="Aucun modèle"
        description="Créez un modèle de grille pour accélérer la création de casiers."
        icon={<IconLayout />}
      />
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      }}
    >
      {templates.map((template) => {
        const layout = {
          preset: 'custom' as const,
          rows: template.rows,
          columns: template.columns,
          cells: template.cells,
        };
        return (
          <Link
            key={template.id}
            href={`/tableau-de-bord/parametres/casiers/modeles/${template.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <article style={{ ...webCardStyle, padding: '1rem', height: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: '0.5rem',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{template.name}</h3>
                {template.isStarter ? (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: colors.primary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    DÉMARRAGE
                  </span>
                ) : null}
              </div>
              {template.description ? (
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.8125rem',
                    color: colors.secondary,
                    opacity: 0.8,
                  }}
                >
                  {template.description}
                </p>
              ) : (
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.8125rem',
                    color: colors.secondary,
                    opacity: 0.6,
                  }}
                >
                  {template.rows}×{template.columns} — {template.capacity} compartiments
                </p>
              )}
              <LockerLayoutPreview layout={layout} compact />
            </article>
          </Link>
        );
      })}
    </div>
  );
}
