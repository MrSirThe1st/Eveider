'use client';

import { PageFrame } from '@eveider/ui';
import type { ReactNode } from 'react';

/**
 * Persistent Organisations directory chrome.
 * Page bodies and their loading.tsx only swap the content below.
 */
export function AdminOrganisationsChrome({ children }: { children: ReactNode }) {
  return (
    <PageFrame
      title="Organisations"
      description="Annuaire des organisations Eveider."
      layout="wide"
    >
      {children}
    </PageFrame>
  );
}
