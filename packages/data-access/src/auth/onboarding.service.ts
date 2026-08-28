import type { UserRole } from '@eveider/domain';
import { deriveUserRole, normalizeUserRole } from '@eveider/domain';
import { AccessDeniedError } from '../context.js';
import type { Queryable } from '../db/index.js';
import type { User } from '../db/types.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

export type OnboardBusinessInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
};

export type OnboardInput = {
  role: UserRole | 'business' | 'courier';
  fullName?: string;
  phone?: string;
  email?: string;
  inviteToken?: string;
  business?: OnboardBusinessInput;
};

export class OnboardingService {
  constructor(
    private readonly users: UserRepository,
    private readonly businesses: BusinessRepository,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly db: Queryable,
  ) {}

  async findProfileByAuthId(authId: string): Promise<User | null> {
    return this.users.findByAuthId(authId);
  }

  async ensureProfile(authId: string, input: OnboardInput): Promise<User> {
    const existing = await this.users.findByAuthId(authId);
    if (existing) {
      return existing;
    }

    const persona = normalizeUserRole(input.role) ?? input.role;

    if (persona === 'organization' || persona === 'business') {
      if (!input.business) {
        throw new Error('Business details required for organization role');
      }
      const business = await this.businesses.create({
        name: input.business.name,
        contactEmail: input.business.contactEmail,
        contactPhone: input.business.contactPhone,
        industry: input.business.industry,
      });
      const profile = await this.users.createProfile({
        authId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
      });
      await this.memberships.upsert({
        userId: profile.id,
        businessId: business.id,
        role: 'account_owner',
      });
      return profile;
    }

    const isCustomer = persona === 'customer';
    const profile = await this.users.createProfile({
      authId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      isCustomer,
    });

    if (isCustomer) {
      return this.afterCustomerProfileCreated(profile);
    }

    return profile;
  }

  private async afterCustomerProfileCreated(profile: User): Promise<User> {
    if (profile.phone) {
      await this.db.query(
        `UPDATE parcels
         SET customer_id = $1, updated_at = NOW()
         WHERE recipient_phone = $2 AND customer_id IS NULL`,
        [profile.id, profile.phone],
      );
    }
    return profile;
  }

  async requireProfile(authId: string): Promise<User> {
    const profile = await this.users.findByAuthId(authId);
    if (!profile) {
      throw new AccessDeniedError('Profil utilisateur introuvable');
    }
    if (profile.isBlocked) {
      throw new AccessDeniedError('Accès interdit : Compte suspendu ou bloqué');
    }
    if (profile.deletedAt) {
      throw new AccessDeniedError('Accès interdit : Compte supprimé');
    }
    if (profile.deactivatedAt) {
      throw new AccessDeniedError('Accès interdit : Compte désactivé');
    }
    return profile;
  }

  async requireRole(authId: string, allowedRoles: readonly UserRole[]): Promise<User> {
    const profile = await this.requireProfile(authId);
    const memberships = await this.memberships.listByUserIdWithOrgFlags(profile.id);
    const mobile = deriveUserRole({
      isCustomer: profile.isCustomer,
      platformRole: profile.platformRole,
      memberships: memberships.map((membership) => ({
        organizationId: membership.businessId,
        role: membership.role,
        isPlatformOrg: membership.isPlatformOrg,
      })),
      surface: 'mobile',
    });
    const web = deriveUserRole({
      isCustomer: profile.isCustomer,
      platformRole: profile.platformRole,
      memberships: memberships.map((membership) => ({
        organizationId: membership.businessId,
        role: membership.role,
        isPlatformOrg: membership.isPlatformOrg,
      })),
      surface: 'web',
    });
    const allowed = new Set(allowedRoles);
    if ((mobile && allowed.has(mobile)) || (web && allowed.has(web))) {
      return profile;
    }
    throw new AccessDeniedError('Rôle non autorisé pour cette application');
  }
}
