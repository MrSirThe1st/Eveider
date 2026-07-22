import type { UserRole } from '@eveider/domain';
import { AccessDeniedError } from '../context.js';
import type { Queryable } from '../db/index.js';
import type { User } from '../db/types.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

export type OnboardBusinessInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type OnboardInput = {
  role: UserRole;
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

    if (input.role === 'business') {
      if (!input.business) {
        throw new Error('Business details required for business role');
      }
      const business = await this.businesses.create(input.business);
      return this.users.createProfile({
        authId,
        role: 'business',
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        businessId: business.id,
      });
    }

    const profile = await this.users.createProfile({
      authId,
      role: input.role,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
    });

    return this.afterCustomerProfileCreated(profile, input);
  }

  private async afterCustomerProfileCreated(profile: User, input: OnboardInput): Promise<User> {
    if (profile.role !== 'customer') {
      return profile;
    }

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
    return profile;
  }

  async requireRole(authId: string, allowedRoles: readonly UserRole[]): Promise<User> {
    const profile = await this.requireProfile(authId);
    if (!allowedRoles.includes(profile.role)) {
      throw new AccessDeniedError('Rôle non autorisé pour cette application');
    }
    return profile;
  }
}
