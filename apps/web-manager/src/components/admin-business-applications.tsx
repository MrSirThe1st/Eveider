'use client';

import { colors } from '@eveider/config-ui';
import {
  DataTable,
  DEFAULT_TABLE_PAGE_SIZE,
  IconBuilding,
  IconSearch,
  TableCellStack,
  type DataTableColumn,
  StatusBadge,
} from '@eveider/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { VerificationStatusBadge } from '@/components/verification-status-badge';
import { ListSearchField } from '@/components/list-search-field';
import type { BusinessApplicationItem } from '@/server/business-applications';
import { matchesListSearch } from '@/lib/list-search';

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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        const owner = application.users?.[0]?.fullName ?? '';
        const address =
          application.locations?.find((location) => location.type === 'business_address')?.street ??
          '';
        return matchesListSearch(
          searchQuery,
          application.name,
          owner,
          application.contactEmail,
          application.contactPhone,
          address,
        );
      }),
    [applications, searchQuery],
  );

  const columns = useMemo<DataTableColumn<BusinessApplicationItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Organisation',
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <TableCellStack
            primary={
              <Link
                href={`/tableau-de-bord/organisations/${row.id}/verification/dossier`}
                className="nb-data-table__link"
              >
                {row.name}
              </Link>
            }
            secondary={row.locations?.find((l) => l.type === 'business_address')?.street ?? '—'}
          />
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
          return <TableCellStack primary={owner} secondary={contact} />;
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
        sortValue: (row) => row.verificationStatus ?? row.status,
        cell: (row) => (
          <VerificationStatusBadge
            status={
              row.verificationStatus === 'pending' ||
              row.verificationStatus === 'approved' ||
              row.verificationStatus === 'rejected' ||
              row.verificationStatus === 'correction_requested'
                ? row.verificationStatus
                : 'not_started'
            }
          />
        ),
      },
      {
        id: 'updatedAt',
        header: 'Mis à jour',
        sortable: true,
        sortValue: (row) => new Date(row.updatedAt).getTime(),
        numeric: true,
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
      rows={filteredApplications}
      getRowId={(row) => row.id}
      search={
        <ListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un dossier (organisation, propriétaire, contact)…"
          ariaLabel="Rechercher un dossier de vérification"
        />
      }
      emptyTitle={searchQuery.trim() ? 'Aucun résultat' : 'Aucune demande'}
      emptyDescription={
        searchQuery.trim()
          ? 'Aucun dossier ne correspond à la recherche actuelle.'
          : 'Les dossiers de vérification en attente apparaîtront ici.'
      }
      emptyIcon={searchQuery.trim() ? <IconSearch /> : <IconBuilding />}
      emptyAction={
        searchQuery.trim() ? (
          <button
            type="button"
            className="nb-btn nb-btn-secondary nb-btn--sm"
            onClick={() => setSearchQuery('')}
          >
            Réinitialiser les filtres
          </button>
        ) : undefined
      }
      sortBy="updatedAt"
      pageSize={DEFAULT_TABLE_PAGE_SIZE}
      rowPrimaryAction={(row) => ({
        label: 'Examiner',
        href: `/tableau-de-bord/organisations/${row.id}/verification/dossier`,
      })}
    />
  );
}
