'use client';

import { colors, typography } from '@eveider/config-ui';
import {
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from '@eveider/ui';
import Link from 'next/link';
import { useMemo } from 'react';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import type { BusinessApplicationItem } from '@/server/business-applications';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function typeLabel(app: BusinessApplicationItem): string {
  if (app.riskClassification === 'registered_business') return 'Enregistrée';
  if (app.riskClassification === 'individual_seller') return 'Individuel';
  if (app.businessType === 'registered_company') return 'Entreprise';
  if (app.businessType === 'individual') return 'Individuel';
  return app.businessType ?? 'Entreprise';
}

type AdminBusinessApplicationsProps = {
  applications: BusinessApplicationItem[];
};

export function AdminBusinessApplications({ applications }: AdminBusinessApplicationsProps) {
  const columns = useMemo<DataTableColumn<BusinessApplicationItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Entreprise',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div>
            <Link
              href={`/tableau-de-bord/entreprises/applications/${row.id}`}
              className="nb-data-table__link"
            >
              {row.name}
            </Link>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: typography.caption.fontSize,
                color: colors.textMuted,
              }}
            >
              {row.locations?.find((l) => l.type === 'business_address')?.street ?? '—'}
            </p>
          </div>
        ),
      },
      {
        id: 'owner',
        header: 'Propriétaire',
        sortable: true,
        sortValue: (row) => row.users?.[0]?.fullName ?? row.contactEmail ?? '',
        hideOnMobile: true,
        cell: (row) => {
          const owner = row.users?.[0]?.fullName ?? row.contactEmail ?? '—';
          const contact = row.contactPhone ?? row.contactEmail ?? '—';
          return (
            <div>
              <div style={{ fontWeight: typography.weights.semibold }}>{owner}</div>
              <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
                {contact}
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (row) => typeLabel(row),
        hideOnMobile: true,
        cell: (row) => (
          <StatusBadge tone="info" withDot={false}>
            {typeLabel(row)}
          </StatusBadge>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <BusinessStatusBadge status={row.status} />,
      },
      {
        id: 'updatedAt',
        header: 'Mis à jour',
        sortable: true,
        sortValue: (row) => new Date(row.updatedAt).getTime(),
        align: 'right',
        cell: (row) => (
          <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={applications}
      getRowId={(row) => row.id}
      caption={
        applications.length > 0
          ? `${applications.length} dossier${applications.length > 1 ? 's' : ''}`
          : undefined
      }
      emptyTitle="Aucun dossier"
      emptyDescription="Les nouvelles demandes d'inscription entreprise apparaîtront ici."
      initialSortId="updatedAt"
      initialSortDirection="desc"
      rowActions={(row) => [
        {
          id: 'review',
          label: 'Examiner le dossier',
          href: `/tableau-de-bord/entreprises/applications/${row.id}`,
        },
      ]}
    />
  );
}
