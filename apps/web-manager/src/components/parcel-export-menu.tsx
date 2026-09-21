'use client';

import { spacing } from '@eveider/config-ui';
import { Button, DropdownMenu, useToast } from '@eveider/ui';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { buildExportUrl, downloadExport } from '@/lib/export/download-export';

type ParcelExportMenuProps = {
  exportPath: string;
  filters?: {
    location?: string;
    search?: string;
    status?: string;
    attention?: string;
    pickupType?: string;
    view?: string;
    courierId?: string;
    lockerId?: string;
    businessId?: string;
    days?: string;
  };
  compact?: boolean;
  /** Single download icon with a menu. Prefer for dense Admin toolbars. */
  iconOnly?: boolean;
};

export function ParcelExportMenu({
  exportPath,
  filters = {},
  compact = false,
  iconOnly = false,
}: ParcelExportMenuProps) {
  const toast = useToast();
  const [loadingScope, setLoadingScope] = useState<'filtered' | 'all' | null>(null);

  async function handleExport(scope: 'filtered' | 'all') {
    setLoadingScope(scope);
    try {
      await downloadExport(
        buildExportUrl(exportPath, {
          scope,
          location: filters.location,
          search: filters.search,
          status: filters.status,
          attention: filters.attention,
          pickupType: filters.pickupType,
          view: filters.view,
          courierId: filters.courierId,
          lockerId: filters.lockerId,
          businessId: filters.businessId,
          days: filters.days,
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export impossible', 'Excel');
    } finally {
      setLoadingScope(null);
    }
  }

  if (iconOnly) {
    return (
      <DropdownMenu
        label="Exporter"
        align="end"
        trigger={<Download width={16} height={16} aria-hidden />}
        items={[
          {
            id: 'filtered',
            label: loadingScope === 'filtered' ? 'Export…' : 'Exporter (filtres)',
            disabled: loadingScope != null,
            onClick: () => void handleExport('filtered'),
          },
          {
            id: 'all',
            label: loadingScope === 'all' ? 'Export…' : 'Exporter tout',
            disabled: loadingScope != null,
            onClick: () => void handleExport('all'),
          },
        ]}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        disabled={loadingScope != null}
        onClick={() => void handleExport('filtered')}
      >
        {loadingScope === 'filtered' ? 'Export…' : 'Exporter (filtres)'}
      </Button>
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        disabled={loadingScope != null}
        onClick={() => void handleExport('all')}
      >
        {loadingScope === 'all' ? 'Export…' : 'Exporter tout'}
      </Button>
    </div>
  );
}
