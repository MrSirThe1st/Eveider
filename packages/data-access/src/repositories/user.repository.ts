import type { UserRole } from '@eveider/domain';
import type { Prisma, PrismaClient, User } from '@prisma/client';

export type CreateUserProfileInput = {
  authId: string;
  role: UserRole;
  email?: string;
  phone?: string;
  fullName?: string;
  businessId?: string;
};

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByAuthId(authId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { authId } });
  }

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  findCustomerByPhone(phone: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { phone, role: 'customer' },
    });
  }

  createProfile(input: CreateUserProfileInput): Promise<User> {
    return this.db.user.create({
      data: {
        authId: input.authId,
        role: input.role,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        businessId: input.businessId,
      },
    });
  }

  listByBusiness(businessId: string): Promise<User[]> {
    return this.db.user.findMany({ where: { businessId } });
  }

  listByRole(role: UserRole): Promise<User[]> {
    return this.db.user.findMany({
      where: { role },
      orderBy: { fullName: 'asc' },
    });
  }

  listByRoleWithSearch(role: UserRole, search?: string): Promise<User[]> {
    const where: Prisma.UserWhereInput = { role };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.db.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });
  }

  updateProfile(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }
}
