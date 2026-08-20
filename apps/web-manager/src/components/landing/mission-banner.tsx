import {
  EMPTY_LANDING_NETWORK_STATS,
  getCachedPublicNetworkStats,
} from '@/lib/landing-network-stats';
import { MissionBannerCounts } from './mission-banner-counts';

export async function MissionBanner() {
  let stats = EMPTY_LANDING_NETWORK_STATS;
  try {
    stats = await getCachedPublicNetworkStats();
  } catch {
    /* keep zeros if Postgres is unreachable */
  }

  return <MissionBannerCounts stats={stats} />;
}
