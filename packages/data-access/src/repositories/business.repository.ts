import {
  canSubmitParcelsAsBusiness,
  canTransitionBusiness,
  transitionBusiness,
  type BusinessStatus,
} from '@eveider/domain';
import type { Business, PrismaClient } from '@prisma/client';
import { assertAdmin, assertBusinessScope, type DataAccessContext } from '../context.js';

export type CreateBusinessInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
};

export class BusinessRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateBusinessInput): Promise<Business> {
    return this.db.business.create({
      data: {
        name: input.name,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        status: 'active',
      },
    });
  }

  findById(ctx: DataAccessContext, id: string): Promise<Business | null> {
    assertBusinessScope(ctx, id);
    return this.db.business.findUnique({ where: { id } });
  }

  list(ctx: DataAccessContext): Promise<Business[]> {
    if (ctx.role === 'admin') {
      return this.db.business.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (ctx.role === 'business' && ctx.businessId) {
      return this.db.business.findMany({ where: { id: ctx.businessId } });
    }
    return Promise.resolve([]);
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    nextStatus: BusinessStatus,
  ): Promise<Business> {
    assertAdmin(ctx);
    const business = await this.db.business.findUniqueOrThrow({ where: { id } });
    const status = transitionBusiness(business.status, nextStatus);
    return this.db.business.update({ where: { id }, data: { status } });
  }

  async assertCanSubmitParcels(businessId: string): Promise<void> {
    const business = await this.db.business.findUniqueOrThrow({ where: { id: businessId } });
    if (!canSubmitParcelsAsBusiness(business.status)) {
      throw new Error(`Business ${businessId} cannot submit parcels (status: ${business.status})`);
    }
  }

  canTransition(from: BusinessStatus, to: BusinessStatus): boolean {
    return canTransitionBusiness(from, to);
  }
}
