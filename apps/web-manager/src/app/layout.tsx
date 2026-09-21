import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/app-providers';
import { TawkToWidget } from '@/components/tawk-to-widget';
import { TAWK_INIT_SCRIPT } from '@/lib/tawk';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(portalUrl),
  title: {
    default: 'Eveider — Livraison et retrait de colis à Kinshasa',
    template: '%s · Eveider',
  },
  description:
    'Eveider est un réseau de casiers à Kinshasa pour la livraison et le retrait de colis.',
  other: {
    google: 'notranslate',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode {
  return (
    <html lang="fr" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TAWK_INIT_SCRIPT }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        <TawkToWidget />
      </body>
    </html>
  );
}
