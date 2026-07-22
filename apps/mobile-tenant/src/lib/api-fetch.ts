import { authApiUrl } from './supabase';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

const NETWORK_ERROR =
  `Serveur inaccessible (${authApiUrl}). ` +
  'Vérifiez : web-manager lancé (`pnpm --filter @eveider/web-manager dev`), même Wi‑Fi, ' +
  'EXPO_PUBLIC_AUTH_API_URL=http://<IP-MAC>:3000 dans .env, puis redémarrez Expo.';

const TIMEOUT_ERROR =
  'Délai dépassé — la requête a peut‑être réussi côté serveur. Rechargez pour vérifier le statut.';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);

  try {
    const response = await fetch(`${authApiUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });

    try {
      return (await response.json()) as ApiResult<T>;
    } catch {
      return { success: false, error: `Réponse invalide du serveur (${response.status})` };
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: TIMEOUT_ERROR };
    }
    return { success: false, error: NETWORK_ERROR };
  } finally {
    clearTimeout(timeout);
  }
}
