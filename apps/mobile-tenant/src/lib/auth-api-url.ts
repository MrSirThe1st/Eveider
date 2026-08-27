function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Next `--hostname 0.0.0.0` is IPv4-only, so `localhost` often resolves to
 * `::1` and Expo web / simulators fail to connect. Android emulators also
 * cannot reach the host via 127.0.0.1.
 */
export function resolveAuthApiUrl(
  configured: string,
  platform: 'ios' | 'android' | 'web' | string,
): string {
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    return stripTrailingSlash(configured);
  }

  if (!isLoopbackHost(parsed.hostname)) {
    return stripTrailingSlash(configured);
  }

  parsed.hostname = platform === 'android' ? '10.0.2.2' : '127.0.0.1';
  return stripTrailingSlash(parsed.toString());
}
