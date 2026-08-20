'use client';

import type { LenisOptions } from 'lenis';
import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';
import 'lenis/dist/lenis.css';

const LENIS_OPTIONS: LenisOptions = {
  autoRaf: true,
  lerp: 0.08,
  anchors: { offset: -80 },
  respectReducedMotion: true,
  stopInertiaOnNavigate: true,
};

export function LandingSmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
