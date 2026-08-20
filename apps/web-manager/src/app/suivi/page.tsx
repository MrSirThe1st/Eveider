import { Suspense, type ReactNode } from 'react';
import { LoadingSpinner } from '@eveider/ui';
import { GuestTrackPage } from '@/components/guest-track-page';

export default function SuiviPage(): ReactNode {
  return (
    <Suspense fallback={<LoadingSpinner label="Chargement…" />}>
      <GuestTrackPage />
    </Suspense>
  );
}
