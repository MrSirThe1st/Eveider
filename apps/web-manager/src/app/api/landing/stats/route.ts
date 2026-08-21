import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import {
  getCachedPublicNetworkStats,
  LANDING_STATS_REVALIDATE_SECONDS,
} from '@/lib/landing-network-stats';

/** Numeric literal required by Next.js static analysis. Keep in sync with LANDING_STATS_REVALIDATE_SECONDS. */
export const revalidate = 60;

/** Public — landing page counters (aggregates only). */
export async function GET() {
  try {
    const data = await getCachedPublicNetworkStats();
    return NextResponse.json(ok(data), {
      headers: {
        'Cache-Control': `public, s-maxage=${LANDING_STATS_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
