import type { OrganizationRole, PlatformRole } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapBusiness, mapUser } from '../db/mappers.js';
import type { Business, OrganizationMembership, User } from '../db/types.js';

export type CreateUserProfileInput = {
  authId: string;
  email?: string;
  phone?: string;
  fullName?: string;
  isCustomer?: boolean;
  platformRole?: PlatformRole | null;
};

export type UpdateUserProfileInput = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  isCustomer?: boolean;
  platformRole?: PlatformRole | null;
  isBlocked?: boolean;
  deactivatedAt?: Date | null;
  deletedAt?: Date | null;
};

export class UserRepository {
  constructor(private readonly db: Queryable) {}

  async findByAuthId(authId: string): Promise<User | null> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE auth_id = $1 LIMIT 1`,
      [authId],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async findCustomerByPhone(phone: string): Promise<User | null> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE phone = $1 AND is_customer = true LIMIT 1`,
      [phone],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async createProfile(input: CreateUserProfileInput): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (auth_id, email, phone, full_name, is_customer, platform_role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.authId,
        input.email ?? null,
        input.phone ?? null,
        input.fullName ?? null,
        input.isCustomer ?? false,
        input.platformRole ?? null,
      ],
    );
    return mapUser(result.rows[0]!);
  }

  async findByAuthIdWithBusiness(
    authId: string,
    organizationId?: string,
  ): Promise<{ user: User; business: Business | null } | null> {
    const user = await this.findByAuthId(authId);
    if (!user) return null;

    const params: unknown[] = [user.id];
    let sql = `SELECT b.*
       FROM organization_memberships m
       JOIN businesses b ON b.id = m.business_id
       WHERE m.user_id = $1`;
    if (organizationId) {
      params.push(organizationId);
      sql += ` AND m.business_id = $2`;
    }
    sql += ` ORDER BY CASE WHEN m.role IN ('account_owner', 'admin', 'dispatcher') THEN 0 ELSE 1 END, m.created_at ASC LIMIT 1`;

    const result = await this.db.query(sql, params);
    const row = result.rows[0];
    return { user, business: row ? mapBusiness(row) : null };
  }

  async listByBusiness(businessId: string): Promise<User[]> {
    const result = await this.db.query(
      `SELECT u.* FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
       WHERE m.business_id = $1 AND m.role <> 'driver'
       ORDER BY u.full_name ASC NULLS LAST`,
      [businessId],
    );
    return result.rows.map(mapUser);
  }

  async listActiveCouriersByBusiness(businessId: string): Promise<User[]> {
    return this.listActiveDriversByBusiness(businessId);
  }

  async listActiveDriversByBusiness(businessId: string): Promise<User[]> {
    const result = await this.db.query(
      `SELECT u.* FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
       WHERE m.business_id = $1
         AND m.role = 'driver'
         AND u.is_blocked = false
         AND u.deactivated_at IS NULL
         AND u.deleted_at IS NULL
       ORDER BY u.full_name ASC NULLS LAST`,
      [businessId],
    );
    return result.rows.map(mapUser);
  }

  async listAssignableDriversByBusiness(businessId: string): Promise<User[]> {
    const result = await this.db.query(
      `SELECT DISTINCT u.* FROM users u
       JOIN organization_memberships m
         ON m.user_id = u.id AND m.business_id = $1 AND m.role = 'driver'
       JOIN driver_dossiers d
         ON d.user_id = u.id AND d.business_id = $1
        AND d.contractor_type = 'business'
        AND d.status IN (
          'pending_review', 'needs_correction', 'approved', 'invited', 'active'
        )
       WHERE u.is_blocked = false
         AND u.deactivated_at IS NULL
         AND u.deleted_at IS NULL
       ORDER BY u.full_name ASC NULLS LAST`,
      [businessId],
    );
    return result.rows.map(mapUser);
  }

  async listAssignableCouriers(): Promise<User[]> {
    return this.listAssignableDrivers();
  }

  async listAssignableDrivers(): Promise<User[]> {
    const result = await this.db.query(
      `SELECT DISTINCT u.* FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
       WHERE m.role = 'driver'
         AND u.is_blocked = false
         AND u.deactivated_at IS NULL
         AND u.deleted_at IS NULL
       ORDER BY u.full_name ASC NULLS LAST`,
    );
    return result.rows.map(mapUser);
  }

  async listPlatformStaff(): Promise<User[]> {
    const result = await this.db.query(
      `SELECT * FROM users
       WHERE platform_role IS NOT NULL
       ORDER BY full_name ASC NULLS LAST`,
    );
    return result.rows.map(mapUser);
  }

  async listCustomers(search?: string): Promise<User[]> {
    if (!search) {
      const result = await this.db.query(
        `SELECT * FROM users WHERE is_customer = true ORDER BY full_name ASC NULLS LAST`,
      );
      return result.rows.map(mapUser);
    }
    const pattern = `%${search}%`;
    const result = await this.db.query(
      `SELECT * FROM users
       WHERE is_customer = true
         AND (
           full_name ILIKE $1
           OR email ILIKE $1
           OR phone ILIKE $1
         )
       ORDER BY full_name ASC NULLS LAST`,
      [pattern],
    );
    return result.rows.map(mapUser);
  }

  async listByRoleWithSearch(role: string, search?: string): Promise<User[]> {
    if (role === 'admin') return this.listPlatformStaff();
    if (role === 'customer') return this.listCustomers(search);
    if (role === 'courier' || role === 'driver') {
      const drivers = await this.listAssignableDrivers();
      if (!search) return drivers;
      const q = search.toLowerCase();
      return drivers.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(q) ||
          user.email?.toLowerCase().includes(q) ||
          user.phone?.toLowerCase().includes(q),
      );
    }
    return [];
  }

  async updateProfile(id: string, data: UpdateUserProfileInput): Promise<User> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const push = (column: string, value: unknown) => {
      sets.push(`${column} = $${i++}`);
      values.push(value);
    };

    if (data.email !== undefined) push('email', data.email);
    if (data.phone !== undefined) push('phone', data.phone);
    if (data.fullName !== undefined) push('full_name', data.fullName);
    if (data.isCustomer !== undefined) push('is_customer', data.isCustomer);
    if (data.platformRole !== undefined) push('platform_role', data.platformRole);
    if (data.isBlocked !== undefined) push('is_blocked', data.isBlocked);
    if (data.deactivatedAt !== undefined) push('deactivated_at', data.deactivatedAt);
    if (data.deletedAt !== undefined) push('deleted_at', data.deletedAt);

    if (sets.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`User ${id} not found`);
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    const row = result.rows[0];
    if (!row) throw new Error(`User ${id} not found`);
    return mapUser(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email.trim()],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async countCompanyAdmins(businessId: string, excludeUserId?: string): Promise<number> {
    const params: unknown[] = [businessId];
    let sql = `SELECT COUNT(*)::int AS count
       FROM organization_memberships
       WHERE business_id = $1
         AND role IN ('account_owner', 'admin')`;
    if (excludeUserId) {
      params.push(excludeUserId);
      sql += ` AND user_id <> $${params.length}`;
    }
    const result = await this.db.query(sql, params);
    return Number(result.rows[0]?.count ?? 0);
  }
}

export type { OrganizationMembership };
