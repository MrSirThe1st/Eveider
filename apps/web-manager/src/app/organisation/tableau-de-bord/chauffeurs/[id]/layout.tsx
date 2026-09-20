import { redirect } from 'next/navigation';

export default function BusinessDriverLegacyLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  redirect('/organisation/tableau-de-bord');
}
