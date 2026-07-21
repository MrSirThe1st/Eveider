import { redirect } from 'next/navigation';

export default function LegacyInscriptionPage() {
  const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3000';
  redirect(`${platformUrl}/inscription`);
}
