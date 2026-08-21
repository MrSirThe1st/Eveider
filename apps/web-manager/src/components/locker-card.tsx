'use client';

import { colors, borderStrong, borderSubtle, webCardStyle } from '@eveider/config-ui';
import {
  lockerAvailableLabel,
  lockerNetworkLabel,
  lockerOperatingStatus,
  usesCompartmentGrid,
  type LockerStatus,
  type LockerType,
} from '@eveider/domain';
import { LockerSizeSummary } from '@/components/compartment-select-grid';
import { LockerStatusBadge } from '@/components/locker-status-badge';

export type LockerOption = {
  id: string;
  name: string;
  address: string;
  type?: LockerType;
  networkLabel?: string;
  availableCompartments: number;
  availableSlots?: number;
  availableLabel?: string;
  availableBySize?: { small: number; medium: number; large: number };
  capacity?: number;
  status?: LockerStatus;
  operatingStatus?: LockerStatus;
  operatingStatusLabel?: string;
  selectable?: boolean;
  rows?: number;
  columns?: number;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
};

type LockerCardProps = {
  locker: LockerOption;
  selected: boolean;
  onSelect: (lockerId: string) => void;
};

export function lockerOptionSlots(locker: LockerOption): number {
  return locker.availableSlots ?? locker.availableCompartments;
}

export function lockerOptionSelectable(locker: LockerOption): boolean {
  if (locker.selectable != null) return locker.selectable;
  return lockerOptionSlots(locker) > 0 && (locker.status == null || locker.status === 'active');
}

export function LockerCard({ locker, selected, onSelect }: LockerCardProps) {
  const slots = lockerOptionSlots(locker);
  const selectable = lockerOptionSelectable(locker);
  const type = locker.type ?? 'SMART_LOCKER';
  const smart = usesCompartmentGrid(type);
  const operatingStatus =
    locker.operatingStatus ??
    lockerOperatingStatus({ status: locker.status ?? 'active', availableSlots: slots });
  const title = locker.networkLabel ?? lockerNetworkLabel(type, locker.name);
  const statusText =
    locker.availableLabel ?? lockerAvailableLabel({ type, availableSlots: slots });

  let statusColor: string = colors.success;
  let statusBg = 'rgba(9, 212, 11, 0.1)';
  if (operatingStatus === 'full' || slots === 0) {
    statusColor = colors.danger;
    statusBg = 'rgba(229, 57, 53, 0.1)';
  } else if (operatingStatus === 'offline') {
    statusColor = colors.textMuted;
    statusBg = 'rgba(100, 116, 139, 0.12)';
  } else if (slots === 1) {
    statusColor = colors.warning;
    statusBg = 'rgba(255, 184, 0, 0.1)';
  }

  const sizeSummary = locker.availableBySize ?? {
    small: 0,
    medium: locker.availableCompartments,
    large: 0,
  };

  return (
    <div
      onClick={() => {
        if (selectable) onSelect(locker.id);
      }}
      style={{
        ...webCardStyle,
        background: selectable ? colors.surface : colors.background,
        border: selected ? borderStrong() : 'none',
        padding: '1.25rem',
        cursor: selectable ? 'pointer' : 'not-allowed',
        opacity: selectable ? 1 : 0.6,
        transition: 'all 0.15s ease-in-out',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {selected ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : null}

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingRight: selected ? '1.5rem' : 0,
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: 700,
              color: colors.secondary,
            }}
          >
            {title}
          </h4>
          <LockerStatusBadge status={operatingStatus} />
        </div>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: colors.secondary,
            opacity: 0.8,
            lineHeight: '1.25rem',
          }}
        >
          {locker.address}
        </p>
        {locker.capacity != null ? (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', fontWeight: 600, opacity: 0.55 }}>
            Capacité {locker.capacity}
            {smart && locker.rows && locker.columns ? ` · grille ${locker.rows}×${locker.columns}` : ''}
          </p>
        ) : smart && locker.rows && locker.columns ? (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', fontWeight: 600, opacity: 0.55 }}>
            Grille {locker.rows}×{locker.columns}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: 'auto',
          paddingTop: '0.75rem',
          borderTop: borderSubtle(),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: statusColor,
              backgroundColor: statusBg,
              padding: '3px 8px',
              borderRadius: '4px',
            }}
          >
            {statusText}
          </span>
          {locker.distanceKm != null ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.6 }}>
              {locker.distanceKm.toFixed(1)} km
            </span>
          ) : null}
        </div>
        {smart ? <LockerSizeSummary availableBySize={sizeSummary} /> : null}
      </div>
    </div>
  );
}
