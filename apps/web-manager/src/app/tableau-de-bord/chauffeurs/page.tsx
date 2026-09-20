import { redirect } from 'next/navigation';

export default function AdminDriversLegacyRedirectPage() {
  redirect('/tableau-de-bord/flotte');
}
