import { createRepositories, type PublicNetworkStats } from '@eveider/data-access';
import { unstable_cache } from 'next/cache';

/** Also hardcoded as `export const revalidate = 60` on `/api/landing/stats` (Next.js requires a literal). */
export const LANDING_STATS_REVALIDATE_SECONDS = 60;

export const EMPTY_LANDING_NETWORK_STATS: PublicNetworkStats = {
  kolweziLockers: 0,
  lualabaLockers: 0,
  parcelsHandled: 0,
};

/** Shared Data Cache — landing page and `/api/landing/stats` hit Postgres at most once per minute. */
export const getCachedPublicNetworkStats = unstable_cache(
  async (): Promise<PublicNetworkStats> => {
    const { stats } = createRepositories();
    return stats.getPublicNetworkStats();
  },
  ['landing-public-network-stats'],
  { revalidate: LANDING_STATS_REVALIDATE_SECONDS },
);
