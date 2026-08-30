import { redirect } from 'next/navigation';

export default function LegacyApplicationsRedirect() {
  redirect('/tableau-de-bord/organisations/verification');
}
