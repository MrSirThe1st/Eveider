import { authApiUrl } from './supabase';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

function apiBase() {
  // authApiUrl is already platform-resolved at module load; keep a single source of truth.
  return authApiUrl;
}

function networkError() {
  return `Serveur inaccessible (${apiBase()}). Vérifiez votre connexion, puis redémarrez Expo si EXPO_PUBLIC_AUTH_API_URL a changé.`;
}

const TIMEOUT_ERROR =
  'Délai dépassé — la requête a peut‑être réussi côté serveur. Rechargez pour vérifier le statut.';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  const base = apiBase();

  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal as never,
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
    return { success: false, error: networkError() };
  } finally {
    clearTimeout(timeout);
  }
}
