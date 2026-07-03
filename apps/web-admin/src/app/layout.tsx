import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionKeeper } from '@/components/session-keeper';
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
      <body>
        <SessionKeeper />
        {children}
      </body>
    </html>
  );
}
