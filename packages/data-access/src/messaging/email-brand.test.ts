import { describe, expect, it } from 'vitest';
import { getEveiderLogoAttachment, getEveiderLogoUrl, resolveEmailLogo } from './email-brand.js';

describe('email brand assets', () => {
  it('loads the PNG logo from disk without passing a URL instance to fs', () => {
    const logo = getEveiderLogoAttachment();

    expect(logo.filename).toBe('eveider_logo.png');
    expect(logo.contentId).toBe('eveider-logo');
    expect(logo.contentType).toBe('image/png');
    expect(Buffer.isBuffer(logo.content)).toBe(true);
    expect(logo.content.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
  });

  it('exposes a hosted fallback URL', () => {
    expect(getEveiderLogoUrl()).toMatch(/\/email\/eveider_logo\.png$/);
  });

  it('prefers a CID attachment when the logo file is available', () => {
    const logo = resolveEmailLogo();
    expect(logo.src).toBe('cid:eveider-logo');
    expect(logo.attachments).toHaveLength(1);
  });
});
