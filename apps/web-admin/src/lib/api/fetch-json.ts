import type { ApiResult } from '@eveider/api-contracts';

export class ApiFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiFetchError';
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = (await response.json()) as ApiResult<T>;

  if (!result.success) {
    throw new ApiFetchError(result.error ?? 'Erreur serveur');
  }

  return result.data;
}
