import { describe, expect, it } from 'vitest';
import { resolveAuthApiUrl } from './auth-api-url';

describe('resolveAuthApiUrl', () => {
  it('rewrites localhost to IPv4 loopback on web', () => {
    expect(resolveAuthApiUrl('http://localhost:3000', 'web')).toBe('http://127.0.0.1:3000');
  });

  it('rewrites localhost to the Android emulator host alias', () => {
    expect(resolveAuthApiUrl('http://localhost:3000', 'android')).toBe('http://10.0.2.2:3000');
  });

  it('rewrites IPv6 loopback on iOS simulator', () => {
    expect(resolveAuthApiUrl('http://[::1]:3000', 'ios')).toBe('http://127.0.0.1:3000');
  });

  it('leaves production hosts unchanged', () => {
    expect(resolveAuthApiUrl('https://www.eveider.com', 'web')).toBe('https://www.eveider.com');
    expect(resolveAuthApiUrl('http://172.20.10.2:3000', 'android')).toBe(
      'http://172.20.10.2:3000',
    );
  });
});
