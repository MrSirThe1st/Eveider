'use client';

import { ToastProvider } from '@eveider/ui';
import type { ReactNode } from 'react';
import { CookieConsentHost } from '@/components/cookies/cookie-consent-host';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <CookieConsentHost />
    </ToastProvider>
  );
}
