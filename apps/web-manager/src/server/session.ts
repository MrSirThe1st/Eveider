import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AdminSession, BusinessSession } from '@/lib/session';
import { requireAdminSession, requireBusinessSession } from '@/lib/session';

/** Admin session resolved once per RSC request (deduped across layout + page). */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const result = await requireAdminSession();
  if ('error' in result) {
    if (result.status === 401) {
      redirect('/connexion');
    }
    redirect('/');
  }
  return result.session;
});

/** Business session resolved once per RSC request. */
export const getBusinessSession = cache(async (): Promise<BusinessSession> => {
  const result = await requireBusinessSession();
  if ('error' in result) {
    if (result.status === 401) {
      redirect('/connexion');
    }
    redirect('/inscription');
  }
  return result.session;
});
