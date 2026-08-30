'use client';

import { colors, typography } from '@eveider/config-ui';
import { DataTable, type DataTableColumn } from '@eveider/ui';
import { useMemo } from 'react';
import { ORGANIZATION_ROLE_LABELS, type OrganizationRole } from '@eveider/domain';
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
          <div>
            <div style={{ fontWeight: typography.weights.semibold }}>
              {row.fullName ?? '—'}
            </div>
            <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted }}>
              {row.email ?? '—'}
            </div>
          </div>
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
      emptyTitle="Aucun membre"
    />
  );
}
