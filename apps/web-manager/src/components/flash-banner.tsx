'use client';

import { InlineAlert, type InlineAlertVariant } from '@eveider/ui';

type FlashBannerProps = {
  message: string;
  variant?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
};

/** @deprecated Prefer InlineAlert or useToast — kept for existing call sites. */
export function FlashBanner({ message, variant = 'success', onDismiss }: FlashBannerProps) {
  return (
    <InlineAlert
      message={message}
      variant={variant as InlineAlertVariant}
      onDismiss={onDismiss}
    />
  );
}
