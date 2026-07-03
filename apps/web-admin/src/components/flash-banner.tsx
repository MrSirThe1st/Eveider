'use client';

import { colors, radius } from '@eveider/config-ui';

type FlashBannerProps = {
  message: string;
  variant?: 'success' | 'error';
  onDismiss?: () => void;
};

export function FlashBanner({ message, variant = 'success', onDismiss }: FlashBannerProps) {
  const isSuccess = variant === 'success';

  return (
    <div
      role="status"
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: radius.card,
        border: `1px solid ${isSuccess ? colors.primary : colors.danger}`,
        background: isSuccess ? '#E8FCE8' : '#FDECEC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.02em' }}>
        {message}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            color: colors.secondary,
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
