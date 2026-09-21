import { describe, expect, it } from 'vitest';
import { isAdminPortalPath, shouldLoadTawk } from './tawk';

describe('Tawk widget visibility', () => {
  it('hides on the Eveider admin portal', () => {
    expect(isAdminPortalPath('/tableau-de-bord')).toBe(true);
    expect(isAdminPortalPath('/tableau-de-bord/colis')).toBe(true);
    expect(isAdminPortalPath('/tableau-de-bord/parametres/plateforme')).toBe(true);
    expect(shouldLoadTawk('/tableau-de-bord')).toBe(false);
  });

  it('shows on landing, public pages, and the organisation portal', () => {
    expect(shouldLoadTawk('/')).toBe(true);
    expect(shouldLoadTawk('/connexion')).toBe(true);
    expect(shouldLoadTawk('/inscription')).toBe(true);
    expect(shouldLoadTawk('/suivi')).toBe(true);
    expect(shouldLoadTawk('/organisation/tableau-de-bord')).toBe(true);
    expect(shouldLoadTawk('/organisation/tableau-de-bord/colis')).toBe(true);
    expect(isAdminPortalPath('/organisation/tableau-de-bord')).toBe(false);
  });
});
