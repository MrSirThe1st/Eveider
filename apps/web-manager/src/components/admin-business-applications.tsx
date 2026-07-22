'use client';

import { colors, radius, webCardStyle } from '@eveider/config-ui';
import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';
import Link from 'next/link';
import type { BusinessApplicationItem } from '@/server/business-applications';

function getStatusBadge(status: BusinessStatus) {
  const label = BUSINESS_STATUS_LABELS[status] ?? status;
  let bg = '#F1F5F9';
  let color = '#475569';

  if (status === 'pending_review' || status === 'pending') {
    bg = '#FFFBEB';
    color = '#B45309';
  } else if (status === 'pending_correction') {
    bg = '#FEF3C7';
    color = '#92400E';
  } else if (status === 'active') {
    bg = '#F0FDF4';
    color = '#166534';
  } else if (status === 'blocked') {
    bg = '#FEF2F2';
    color = '#991B1B';
  }

  return (
    <span
      style={{
        background: bg,
        color,
        padding: '0.25rem 0.65rem',
        borderRadius: 4,
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  );
}

type AdminBusinessApplicationsProps = {
  applications: BusinessApplicationItem[];
};

export function AdminBusinessApplications({ applications }: AdminBusinessApplicationsProps) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
          Dossiers d&apos;inscription Business ({applications.length})
        </h2>
      </div>

      {applications.length === 0 ? (
        <div style={{ ...webCardStyle, padding: '3rem', textAlign: 'center', borderRadius: radius.card }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#64748B' }}>
            Aucune demande d&apos;inscription entreprise enregistrée.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {applications.map((app) => {
            const mainAddress =
              app.locations?.find((l) => l.type === 'business_address')?.street ?? 'Kinshasa';
            const owner = app.users?.[0]?.fullName ?? app.contactEmail ?? 'Inconnu';
            const submittedDate = new Date(app.updatedAt).toLocaleDateString('fr-CD', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={app.id}
                style={{
                  ...webCardStyle,
                  padding: '1.25rem 1.5rem',
                  borderRadius: radius.card,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.35rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>{app.name}</h3>
                    {getStatusBadge(app.status)}
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        background: '#F1F5F9',
                        color: '#475569',
                        borderRadius: 4,
                      }}
                    >
                      {app.riskClassification === 'registered_business'
                        ? 'REGISTERED'
                        : app.riskClassification === 'individual_seller'
                          ? 'INDIVIDUAL'
                          : app.businessType ?? 'ENTREPRISE'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84375rem', color: '#475569' }}>
                    <strong>Propriétaire :</strong> {owner} · <strong>Contact :</strong>{' '}
                    {app.contactPhone ?? app.contactEmail ?? '—'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                    Emplacement : {mainAddress} · Mis à jour le {submittedDate}
                  </p>
                </div>

                <Link
                  href={`/tableau-de-bord/entreprises/applications/${app.id}`}
                  style={{
                    background: colors.secondary,
                    color: colors.primary,
                    padding: '0.6rem 1.25rem',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                    letterSpacing: '0.05em',
                  }}
                >
                  EXAMINER LE DOSSIER →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
