import { describe, expect, it } from 'vitest';
import { accountDisplayName, groupNavModules, initialsFromName } from './app-shell-nav.js';

describe('groupNavModules', () => {
  it('groups consecutive items that share a section', () => {
    const groups = groupNavModules([
      { id: 'home' },
      { id: 'inbox' },
      { id: 'lockers', section: 'Réseau' },
      { id: 'fleet', section: 'Réseau' },
      { id: 'settings', section: 'Administration' },
    ]);

    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      [null, ['home', 'inbox']],
      ['Réseau', ['lockers', 'fleet']],
      ['Administration', ['settings']],
    ]);
  });
});

describe('accountDisplayName', () => {
  it('prefers the full name, then the email local part', () => {
    expect(accountDisplayName('Marie Kalala', 'admin@eveider.cd')).toBe('Marie Kalala');
    expect(accountDisplayName('  ', 'admin@eveider.cd')).toBe('admin');
    expect(accountDisplayName(null, null)).toBe('Mon compte');
  });
});

describe('initialsFromName', () => {
  it('uses first and last initials', () => {
    expect(initialsFromName('Marie Kalala')).toBe('MK');
    expect(initialsFromName('Chantal')).toBe('CH');
  });
});
