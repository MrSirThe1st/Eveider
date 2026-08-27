export type AuthCallbackParams = {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  type?: string;
};

const RESET_HOSTS = new Set(['reset-password']);

export function isPasswordResetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (/(?:[?&#]type=)(?:recovery|invite)/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'eveider:') {
      const host = parsed.hostname || parsed.host || parsed.pathname.replace(/^\//, '');
      if (RESET_HOSTS.has(host) || parsed.pathname.includes('reset-password')) return true;
    }
  } catch {
    if (/eveider:\/\/reset-password/i.test(url) || /eveider:\/\/reset-password/i.test(url)) {
      return true;
    }
  }
  return /eveider:\/\/reset-password/i.test(url) || /eveider:\/\/reset-password/i.test(url);
}

function readParams(raw: string): URLSearchParams {
  const trimmed = raw.replace(/^[?#]/, '');
  return new URLSearchParams(trimmed);
}

export function parseAuthCallbackUrl(url: string): AuthCallbackParams {
  let search = '';
  let hash = '';
  try {
    const parsed = new URL(url);
    search = parsed.search;
    hash = parsed.hash;
  } catch {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    if (hashIndex >= 0) hash = url.slice(hashIndex);
    if (queryIndex >= 0 && (hashIndex < 0 || queryIndex < hashIndex)) {
      search = url.slice(queryIndex, hashIndex >= 0 ? hashIndex : undefined);
    }
  }

  const merged = new URLSearchParams([
    ...readParams(search).entries(),
    ...readParams(hash).entries(),
  ]);

  const code = merged.get('code')?.trim() || undefined;
  const accessToken = merged.get('access_token')?.trim() || undefined;
  const refreshToken = merged.get('refresh_token')?.trim() || undefined;
  const type = merged.get('type')?.trim() || undefined;

  return { code, accessToken, refreshToken, type };
}

export function isPasswordSetCallback(params: AuthCallbackParams): boolean {
  return params.type === 'recovery' || params.type === 'invite';
}
