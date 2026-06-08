import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eveider Admin',
  description: 'Tableau de bord opérations Eveider',
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
