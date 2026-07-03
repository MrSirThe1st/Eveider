import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const accessToken = formData.get('access_token');
    const refreshToken = formData.get('refresh_token');
    const redirectParam = formData.get('redirect');

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Jetons d\'authentification manquants' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token: String(accessToken),
      refresh_token: String(refreshToken),
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Échec du transfert de session: ${error.message}` },
        { status: 401 }
      );
    }

    // Determine redirect destination
    let redirectTo = '/tableau-de-bord';
    if (redirectParam) {
      const target = String(redirectParam);
      // Ensure we only redirect to a relative path on the same host for security
      if (target.startsWith('/')) {
        redirectTo = target;
      } else {
        try {
          const parsedUrl = new URL(target);
          if (parsedUrl.host === request.nextUrl.host) {
            redirectTo = parsedUrl.pathname + parsedUrl.search;
          }
        } catch {
          // Ignore invalid URL format
        }
      }
    }

    const redirectUrl = new URL(redirectTo, request.url);
    // Use 303 See Other to ensure the browser performs a GET request to the redirect URL
    return NextResponse.redirect(redirectUrl, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
