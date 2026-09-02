import { describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { OrganizationApiRepository } from './organization-api.repository.js';

const now = new Date('2026-09-02T12:00:00.000Z');
const ctx = createDataAccessContext({
  organizationId: 'biz-1',
  organizationRole: 'admin',
});

function keyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    business_id: 'biz-1',
    name: 'Clé principale',
    key_prefix: 'eveider_live_abcd',
    secret_hash: 'abc',
    last_used_at: null,
    revoked_at: null,
    created_at: now,
    ...overrides,
  };
}

describe('OrganizationApiRepository', () => {
  it('lists keys without exposing the hash to callers of listKeys mapping', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM organization_api_keys') && sqlIncludes(sql, 'ORDER BY created_at')) {
        return keyRow();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new OrganizationApiRepository(db);
    const keys = await repo.listKeys('biz-1');
    expect(keys).toHaveLength(1);
    expect(keys[0]?.keyPrefix).toBe('eveider_live_abcd');
    expect(keys[0]).not.toHaveProperty('secretHash');
  });

  it('creates a key after counting active keys', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT COUNT(*)')) {
        return { n: 0 };
      }
      if (sqlIncludes(sql, 'INSERT INTO organization_api_keys')) {
        return keyRow({ name: 'Boutique' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new OrganizationApiRepository(db);
    const created = await repo.createKey(ctx, 'biz-1', 'Boutique');
    expect(created.plaintext.startsWith('eveider_live_')).toBe(true);
    expect(created.key.name).toBe('Boutique');
  });

  it('rejects a notification URL that is not https', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM organization_notification_endpoints')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new OrganizationApiRepository(db);
    await expect(repo.upsertEndpoint(ctx, 'biz-1', 'http://evil.example/hook')).rejects.toThrow(
      'https://',
    );
  });

  it('finds an active key by hash', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'secret_hash = $1')) {
        return keyRow({ secret_hash: 'deadbeef' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new OrganizationApiRepository(db);
    const key = await repo.findActiveByHash('deadbeef');
    expect(key?.id).toBe('key-1');
    expect(key?.secretHash).toBe('deadbeef');
  });
});
