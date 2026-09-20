import { redirect } from 'next/navigation';

export default function AdminOrganizationVerificationRedirectPage() {
  redirect('/tableau-de-bord/organisations');
}
