import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eveider',
  description: 'Réseau de casiers intelligents — entreprises, opérations, clients et coursiers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
