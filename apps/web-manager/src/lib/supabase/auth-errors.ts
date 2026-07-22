import type { AuthError } from '@supabase/supabase-js';

/** True when Supabase Auth failed due to network/transient issues, not a missing session. */
export function isAuthNetworkError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    error.name === 'AuthRetryableFetchError'
  );
}
