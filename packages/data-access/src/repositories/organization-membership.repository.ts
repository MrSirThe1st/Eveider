import {
  isAccountOwnerRole,
  isOrganizationAdminRole,
  type OrganizationRole,
} from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import type { OrganizationMembership } from '../db/types.js';

function mapMembership(row: Record<string, unknown>): OrganizationMembership {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    businessId: String(row.business_id),
    role: row.role as OrganizationRole,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at)),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
  };
}

export class OrganizationMembershipRepository {
  constructor(private readonly db: Queryable) {}

  async listByUserId(userId: string): Promise<OrganizationMembership[]> {
    const result = await this.db.query(
      `SELECT * FROM organization_memberships WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );
    return result.rows.map(mapMembership);
  }

  async listByUserIdWithOrgFlags(
    userId: string,
  ): Promise<Array<OrganizationMembership & { isPlatformOrg: boolean; organizationName: string }>> {
    const result = await this.db.query(
      `SELECT m.*, b.is_platform_org, b.name AS organization_name
       FROM organization_memberships m
       JOIN businesses b ON b.id = m.business_id
       WHERE m.user_id = $1
       ORDER BY m.created_at ASC`,
      [userId],
    );
    return result.rows.map((row) => ({
      ...mapMembership(row),
      isPlatformOrg: Boolean(row.is_platform_org),
      organizationName: String(row.organization_name),
    }));
  }

  async find(userId: string, businessId: string): Promise<OrganizationMembership | null> {
    const result = await this.db.query(
      `SELECT * FROM organization_memberships WHERE user_id = $1 AND business_id = $2 LIMIT 1`,
      [userId, businessId],
    );
    const row = result.rows[0];
    return row ? mapMembership(row) : null;
  }

  async upsert(input: {
    userId: string;
    businessId: string;
    role: OrganizationRole;
  }): Promise<OrganizationMembership> {
    const result = await this.db.query(
      `INSERT INTO organization_memberships (user_id, business_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, business_id)
       DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
       RETURNING *`,
      [input.userId, input.businessId, input.role],
    );
    return mapMembership(result.rows[0]!);
  }

  async updateRole(
    userId: string,
    businessId: string,
    role: OrganizationRole,
  ): Promise<OrganizationMembership> {
    if (isAccountOwnerRole(role)) {
      throw new Error('Le rôle de propriétaire se transmet, il ne s’assigne pas ici');
    }
    const result = await this.db.query(
      `UPDATE organization_memberships
       SET role = $3, updated_at = NOW()
       WHERE user_id = $1 AND business_id = $2
       RETURNING *`,
      [userId, businessId, role],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Membre introuvable');
    return mapMembership(row);
  }

  async remove(userId: string, businessId: string): Promise<void> {
    const current = await this.find(userId, businessId);
    if (!current) throw new Error('Membre introuvable');
    if (isAccountOwnerRole(current.role)) {
      throw new Error('Le propriétaire doit d’abord transférer la propriété');
    }
    await this.db.query(
      `DELETE FROM organization_memberships WHERE user_id = $1 AND business_id = $2`,
      [userId, businessId],
    );
  }

  async transferOwnership(input: {
    businessId: string;
    fromUserId: string;
    toUserId: string;
  }): Promise<void> {
    const from = await this.find(input.fromUserId, input.businessId);
    const to = await this.find(input.toUserId, input.businessId);
    if (!from || !isAccountOwnerRole(from.role)) {
      throw new Error('Seul le propriétaire peut transférer la propriété');
    }
    if (!to || !isOrganizationAdminRole(to.role)) {
      throw new Error('La propriété ne peut être transférée qu’à un administrateur');
    }

    await this.db.query(
      `UPDATE organization_memberships SET role = 'admin', updated_at = NOW()
       WHERE user_id = $1 AND business_id = $2`,
      [input.fromUserId, input.businessId],
    );
    await this.db.query(
      `UPDATE organization_memberships SET role = 'account_owner', updated_at = NOW()
       WHERE user_id = $1 AND business_id = $2`,
      [input.toUserId, input.businessId],
    );
  }
}
