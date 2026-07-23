import { redirect } from 'next/navigation';

export default function AdminLockersRedirectPage() {
  redirect('/tableau-de-bord/points');
}
