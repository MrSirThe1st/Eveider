import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { createClient } from '@/lib/supabase/server';

/**
 * Lightweight session ping for the client keepalive.
 * Uses getSession (cookie read) — middleware already refreshed tokens on this request.
 * Do not call getUser here; a second refresh on the same request can invalidate the session.
 */
export async function GET() {
  const perf = createRequestTimer('GET /api/auth/session');

  try {
    const supabase = await perf.measure('auth.createClient', () => createClient());
    const {
      data: { session },
    } = await perf.measure('auth.getSession', () => supabase.auth.getSession());

    if (!session) {
      perf.flush(401);
      return NextResponse.json(fail('Non authentifié'), { status: 401 });
    }

    perf.flush(200);
    return NextResponse.json(
      ok({
        expiresAt: session.expires_at ?? null,
      }),
    );
  } catch {
    perf.flush(503);
    return NextResponse.json(fail('Service auth indisponible'), { status: 503 });
  }
}
