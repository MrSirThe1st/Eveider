import type { UserRole } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapBusiness, mapUser } from '../db/mappers.js';
import type { Business, BusinessUserRole, User } from '../db/types.js';

export type CreateUserProfileInput = {
  authId: string;
  role: UserRole;
  email?: string;
  phone?: string;
  fullName?: string;
  businessId?: string;
};

export type CreateBusinessUserProfileInput = CreateUserProfileInput & {
  userRole: BusinessUserRole;
};

export type UpdateUserProfileInput = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  businessId?: string | null;
  isBlocked?: boolean;
  role?: UserRole;
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
      `SELECT * FROM users WHERE phone = $1 AND role = 'customer' LIMIT 1`,
      [phone],
    );
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async createProfile(input: CreateUserProfileInput): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (auth_id, role, email, phone, full_name, business_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.authId,
        input.role,
        input.email ?? null,
        input.phone ?? null,
        input.fullName ?? null,
        input.businessId ?? null,
      ],
    );
    return mapUser(result.rows[0]!);
  }

  async createBusinessProfile(input: CreateBusinessUserProfileInput): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (auth_id, role, user_role, email, phone, full_name, business_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.authId,
        input.role,
        input.userRole,
        input.email ?? null,
        input.phone ?? null,
        input.fullName ?? null,
        input.businessId ?? null,
      ],
    );
    return mapUser(result.rows[0]!);
  }

  async findByAuthIdWithBusiness(
    authId: string,
  ): Promise<{ user: User; business: Business | null } | null> {
    const result = await this.db.query(
      `SELECT u.*,
              b.id AS business_relation_id,
              b.name AS business_name,
              b.status AS business_status,
              b.business_type AS business_business_type,
              b.industry AS business_industry,
              b.sales_channels AS business_sales_channels,
              b.description AS business_description,
              b.risk_classification AS business_risk_classification,
              b.contact_email AS business_contact_email,
              b.contact_phone AS business_contact_phone,
              b.is_phone_verified AS business_is_phone_verified,
              b.otp_code AS business_otp_code,
              b.otp_expires_at AS business_otp_expires_at,
              b.legal_company_name AS business_legal_company_name,
              b.rccm_number AS business_rccm_number,
              b.nif_number AS business_nif_number,
              b.date_created AS business_date_created,
              b.legal_rep_name AS business_legal_rep_name,
              b.individual_full_name AS business_individual_full_name,
              b.id_passport_number AS business_id_passport_number,
              b.residential_address AS business_residential_address,
              b.created_at AS business_created_at,
              b.updated_at AS business_updated_at
       FROM users u
       LEFT JOIN businesses b ON b.id = u.business_id
       WHERE u.auth_id = $1
       LIMIT 1`,
      [authId],
    );
    const row = result.rows[0];
    if (!row) return null;

    const user = mapUser(row);
    const business = row.business_relation_id
      ? mapBusiness({
          id: row.business_relation_id,
          name: row.business_name,
          status: row.business_status,
          business_type: row.business_business_type,
          industry: row.business_industry,
          sales_channels: row.business_sales_channels,
          description: row.business_description,
          risk_classification: row.business_risk_classification,
          contact_email: row.business_contact_email,
          contact_phone: row.business_contact_phone,
          is_phone_verified: row.business_is_phone_verified,
          otp_code: row.business_otp_code,
          otp_expires_at: row.business_otp_expires_at,
          legal_company_name: row.business_legal_company_name,
          rccm_number: row.business_rccm_number,
          nif_number: row.business_nif_number,
          date_created: row.business_date_created,
          legal_rep_name: row.business_legal_rep_name,
          individual_full_name: row.business_individual_full_name,
          id_passport_number: row.business_id_passport_number,
          residential_address: row.business_residential_address,
          created_at: row.business_created_at,
          updated_at: row.business_updated_at,
        })
      : null;

    return { user, business };
  }

  async listByBusiness(businessId: string): Promise<User[]> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE business_id = $1 ORDER BY full_name ASC NULLS LAST`,
      [businessId],
    );
    return result.rows.map(mapUser);
  }

  async listByRole(role: UserRole): Promise<User[]> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE role = $1 ORDER BY full_name ASC NULLS LAST`,
      [role],
    );
    return result.rows.map(mapUser);
  }

  async listByRoleWithSearch(role: UserRole, search?: string): Promise<User[]> {
    if (!search) {
      return this.listByRole(role);
    }

    const pattern = `%${search}%`;
    const result = await this.db.query(
      `SELECT * FROM users
       WHERE role = $1
         AND (
           full_name ILIKE $2
           OR email ILIKE $2
           OR phone ILIKE $2
         )
       ORDER BY full_name ASC NULLS LAST`,
      [role, pattern],
    );
    return result.rows.map(mapUser);
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
    if (data.businessId !== undefined) push('business_id', data.businessId);
    if (data.isBlocked !== undefined) push('is_blocked', data.isBlocked);
    if (data.role !== undefined) push('role', data.role);

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
}
