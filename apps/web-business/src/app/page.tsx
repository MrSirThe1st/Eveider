import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/tableau-de-bord');
  }

  return <LandingPage />;
}
