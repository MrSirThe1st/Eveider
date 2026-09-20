import { colors } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
  label?: string;
};

const STATUS_STYLES: Record<
  DeliveryStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  completed: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  scanned: {
    bg: colors.infoMuted,
    color: colors.infoFg,
    dot: colors.info,
    border: colors.infoMuted,
  },
  assigned: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.borderSubtle,
  },
  drop_off_pending: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  failed: {
    bg: colors.dangerMuted,
    color: colors.dangerFg,
    dot: colors.danger,
    border: colors.dangerMuted,
  },
};

export function DeliveryStatusBadge({ status, label }: DeliveryStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.assigned;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.65rem',
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.dot,
        }}
      />
      {label ?? DELIVERY_STATUS_LABELS[status]}
    </span>
  );
}

