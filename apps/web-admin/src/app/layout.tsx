import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { SessionKeeper } from '@/components/session-keeper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

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
      <body className={inter.className}>
        <SessionKeeper />
        {children}
      </body>
    </html>
  );
}
