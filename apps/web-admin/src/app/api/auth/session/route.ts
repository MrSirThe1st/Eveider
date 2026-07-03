import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Lightweight session ping for the client keepalive.
 * Uses getSession (cookie read) — middleware already refreshed tokens on this request.
 * Do not call getUser here; a second refresh on the same request can invalidate the session.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(fail('Non authentifié'), { status: 401 });
    }

    return NextResponse.json(
      ok({
        expiresAt: session.expires_at ?? null,
      }),
    );
  } catch {
    return NextResponse.json(fail('Service auth indisponible'), { status: 503 });
  }
}
