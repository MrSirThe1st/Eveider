import { redirect } from 'next/navigation';

export default function AdminNewDriverLegacyRedirectPage() {
  redirect('/tableau-de-bord/flotte/nouveau');
}
