import { Suspense, type ReactNode } from 'react';
import { GuestTrackPage } from '@/components/guest-track-page';

export default function SuiviPage(): ReactNode {
  return (
    <Suspense fallback={<main style={{ padding: '2rem', fontWeight: 600 }}>Chargement…</main>}>
      <GuestTrackPage />
    </Suspense>
  );
}
