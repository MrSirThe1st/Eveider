import { cache } from 'react';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';

/** Request-scoped auth + profile lookup for RSC layouts and pages. */
export const getCurrentUser = cache(resolveCurrentUser);
