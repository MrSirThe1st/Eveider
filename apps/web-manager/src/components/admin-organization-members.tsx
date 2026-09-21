'use client';

import { ORGANIZATION_ROLE_LABELS, type OrganizationRole } from '@eveider/domain';
import { DataTable, IconUsers, TableCellStack, type DataTableColumn } from '@eveider/ui';
import { useMemo } from 'react';
import type { AdminOrganizationMember } from '@/server/organizations';

type AdminOrganizationMembersProps = {
  members: AdminOrganizationMember[];
};

export function AdminOrganizationMembers({ members }: AdminOrganizationMembersProps) {
  const columns = useMemo<DataTableColumn<AdminOrganizationMember>[]>(
    () => [
      {
        id: 'name',
        header: 'Membre',
        sortable: true,
        sortValue: (row) => row.fullName ?? row.email ?? '',
        cell: (row) => (
          <TableCellStack primary={row.fullName ?? '—'} secondary={row.email ?? '—'} />
        ),
      },
      {
        id: 'phone',
        header: 'Téléphone',
        hideOnMobile: true,
        cell: (row) => row.phone ?? '—',
      },
      {
        id: 'role',
        header: 'Rôle',
        sortable: true,
        sortValue: (row) => row.role,
        cell: (row) => ORGANIZATION_ROLE_LABELS[row.role as OrganizationRole] ?? row.role,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={members}
      getRowId={(row) => row.id}
      sortBy="name"
      emptyTitle="Aucun membre"
      emptyDescription="Les membres de cette organisation apparaîtront ici."
      emptyIcon={<IconUsers />}
    />
  );
}
