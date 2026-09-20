import { redirect } from 'next/navigation';

export default function BusinessDriversLegacyLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  redirect('/organisation/tableau-de-bord');
}
