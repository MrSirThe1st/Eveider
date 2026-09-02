import { AccessDeniedError, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import {
  mapOrganizationApiKey,
  mapOrganizationNotificationEndpoint,
} from '../db/mappers.js';
import type { OrganizationApiKey, OrganizationNotificationEndpoint } from '../db/types.js';
import {
  generateNotificationSigningSecret,
  generateOrganizationApiKey,
} from '../org-api/secrets.js';
import { isAllowedNotificationUrl } from '../org-api/notify.js';

const MAX_ACTIVE_KEYS = 5;

export type OrganizationApiKeyPublic = Omit<OrganizationApiKey, 'secretHash'>;

export class OrganizationApiRepository {
  constructor(private readonly db: Queryable) {}

  async findActiveByHash(secretHash: string): Promise<OrganizationApiKey | null> {
    const result = await this.db.query(
      `SELECT * FROM organization_api_keys
       WHERE secret_hash = $1 AND revoked_at IS NULL
       LIMIT 1`,
      [secretHash],
    );
    const row = result.rows[0];
    return row ? mapOrganizationApiKey(row) : null;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.db.query(
      `UPDATE organization_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id],
    );
  }

  async listKeys(businessId: string): Promise<OrganizationApiKeyPublic[]> {
    const result = await this.db.query(
      `SELECT * FROM organization_api_keys
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [businessId],
    );
    return result.rows.map((row) => {
      const key = mapOrganizationApiKey(row);
      const { secretHash: _secretHash, ...publicKey } = key;
      return publicKey;
    });
  }

  async createKey(
    ctx: DataAccessContext,
    businessId: string,
    name?: string,
  ): Promise<{ key: OrganizationApiKeyPublic; plaintext: string }> {
    this.assertOwner(ctx, businessId);
    const count = await this.db.query(
      `SELECT COUNT(*)::int AS n FROM organization_api_keys
       WHERE business_id = $1 AND revoked_at IS NULL`,
      [businessId],
    );
    if (Number(count.rows[0]?.n ?? 0) >= MAX_ACTIVE_KEYS) {
      throw new Error(`Vous pouvez avoir au plus ${MAX_ACTIVE_KEYS} clés actives`);
    }

    const generated = generateOrganizationApiKey();
    const label = name?.trim() ? name.trim() : 'Clé principale';
    const result = await this.db.query(
      `INSERT INTO organization_api_keys (business_id, name, key_prefix, secret_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessId, label, generated.prefix, generated.hash],
    );
    const key = mapOrganizationApiKey(result.rows[0]!);
    const { secretHash: _secretHash, ...publicKey } = key;
    return { key: publicKey, plaintext: generated.plaintext };
  }

  async revokeKey(ctx: DataAccessContext, businessId: string, keyId: string): Promise<void> {
    this.assertOwner(ctx, businessId);
    const result = await this.db.query(
      `UPDATE organization_api_keys
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND business_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [keyId, businessId],
    );
    if (!result.rows[0]) {
      throw new Error('Clé introuvable');
    }
  }

  async getEndpoint(businessId: string): Promise<OrganizationNotificationEndpoint | null> {
    const result = await this.db.query(
      `SELECT * FROM organization_notification_endpoints WHERE business_id = $1 LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    return row ? mapOrganizationNotificationEndpoint(row) : null;
  }

  async upsertEndpoint(
    ctx: DataAccessContext,
    businessId: string,
    url: string | null,
  ): Promise<OrganizationNotificationEndpoint> {
    this.assertOwner(ctx, businessId);
    const trimmed = url?.trim() ? url.trim() : null;
    if (trimmed && !isAllowedNotificationUrl(trimmed)) {
      throw new Error("L'adresse doit commencer par https://");
    }

    const existing = await this.getEndpoint(businessId);
    if (existing) {
      const result = await this.db.query(
        `UPDATE organization_notification_endpoints
         SET url = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [trimmed, existing.id],
      );
      return mapOrganizationNotificationEndpoint(result.rows[0]!);
    }

    const result = await this.db.query(
      `INSERT INTO organization_notification_endpoints (business_id, url, signing_secret, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [businessId, trimmed, generateNotificationSigningSecret()],
    );
    return mapOrganizationNotificationEndpoint(result.rows[0]!);
  }

  async rotateSigningSecret(
    ctx: DataAccessContext,
    businessId: string,
  ): Promise<OrganizationNotificationEndpoint> {
    this.assertOwner(ctx, businessId);
    const existing = await this.getEndpoint(businessId);
    if (!existing) {
      const result = await this.db.query(
        `INSERT INTO organization_notification_endpoints (business_id, url, signing_secret, status)
         VALUES ($1, NULL, $2, 'active')
         RETURNING *`,
        [businessId, generateNotificationSigningSecret()],
      );
      return mapOrganizationNotificationEndpoint(result.rows[0]!);
    }
    const result = await this.db.query(
      `UPDATE organization_notification_endpoints
       SET signing_secret = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [generateNotificationSigningSecret(), existing.id],
    );
    return mapOrganizationNotificationEndpoint(result.rows[0]!);
  }

  async logTestDelivery(
    endpointId: string,
    result: { ok: boolean; httpStatus: number | null; error: string | null },
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO organization_notification_deliveries (
         endpoint_id, parcel_id, event_id, event_type, status, http_status, error
       ) VALUES ($1, NULL, NULL, $2, $3, $4, $5)`,
      [
        endpointId,
        'eveider.test',
        result.ok ? 'sent' : 'failed',
        result.httpStatus,
        result.error,
      ],
    );
  }

  private assertOwner(ctx: DataAccessContext, businessId: string): void {
    if (ctx.organizationId !== businessId && ctx.businessId !== businessId) {
      throw new AccessDeniedError('Compte entreprise requis');
    }
  }
}
