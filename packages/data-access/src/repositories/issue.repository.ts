import { transitionIssue, type IssueStatus, type IssueType } from '@eveider/domain';
import type { Issue, Locker, Parcel, PrismaClient, User } from '@prisma/client';
import {
  AccessDeniedError,
  assertAdmin,
  assertCourierRole,
  assertCustomerOwnsParcel,
  assertCustomerRole,
  type DataAccessContext,
} from '../context.js';

const CUSTOMER_ISSUE_TYPES: IssueType[] = [
  'parcel_problem',
  'locker_unavailable',
  'locker_system',
];

const COURIER_ISSUE_TYPES: IssueType[] = [
  'failed_delivery',
  'locker_unavailable',
  'parcel_problem',
];

export type IssueWithRelations = Issue & {
  parcel: Pick<Parcel, 'id' | 'reference'> | null;
  locker: Pick<Locker, 'id' | 'name'> | null;
  reporter: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
};

const issueInclude = {
  parcel: { select: { id: true, reference: true } },
  locker: { select: { id: true, name: true } },
  reporter: { select: { id: true, fullName: true, email: true, role: true } },
} as const;

export type CreateIssueInput = {
  type: IssueType;
  parcelId?: string;
  lockerId?: string;
  description: string;
};

export class IssueRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(ctx: DataAccessContext, input: CreateIssueInput): Promise<IssueWithRelations> {
    if (ctx.role === 'customer') {
      return this.createForCustomer(ctx, input);
    }
    if (ctx.role === 'courier') {
      return this.createForCourier(ctx, input);
    }
    throw new AccessDeniedError('Customer or courier role required');
  }

  async listForReporter(ctx: DataAccessContext): Promise<IssueWithRelations[]> {
    if (!ctx.userId) {
      throw new AccessDeniedError('User required');
    }
    if (ctx.role !== 'customer' && ctx.role !== 'courier') {
      throw new AccessDeniedError('Customer or courier role required');
    }

    return this.db.issue.findMany({
      where: { reporterId: ctx.userId },
      include: issueInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(
    ctx: DataAccessContext,
    options?: { status?: IssueStatus },
  ): Promise<IssueWithRelations[]> {
    assertAdmin(ctx);

    return this.db.issue.findMany({
      where: options?.status ? { status: options.status } : undefined,
      include: issueInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    status: IssueStatus,
  ): Promise<IssueWithRelations> {
    assertAdmin(ctx);

    const issue = await this.db.issue.findUniqueOrThrow({ where: { id } });
    transitionIssue(issue.status, status);

    return this.db.issue.update({
      where: { id },
      data: { status },
      include: issueInclude,
    });
  }

  private async createForCustomer(
    ctx: DataAccessContext,
    input: CreateIssueInput,
  ): Promise<IssueWithRelations> {
    assertCustomerRole(ctx);
    this.assertAllowedType(input.type, CUSTOMER_ISSUE_TYPES);

    let lockerId = input.lockerId;

    if (input.parcelId) {
      const parcel = await this.db.parcel.findUniqueOrThrow({ where: { id: input.parcelId } });
      assertCustomerOwnsParcel(ctx, parcel.customerId, parcel.recipientPhone);
      lockerId ??= parcel.lockerId ?? undefined;
    }

    if (input.lockerId) {
      await this.db.locker.findUniqueOrThrow({ where: { id: input.lockerId } });
    }

    return this.db.issue.create({
      data: {
        type: input.type,
        description: input.description,
        parcelId: input.parcelId,
        lockerId,
        reporterId: ctx.userId!,
      },
      include: issueInclude,
    });
  }

  private async createForCourier(
    ctx: DataAccessContext,
    input: CreateIssueInput,
  ): Promise<IssueWithRelations> {
    assertCourierRole(ctx);
    this.assertAllowedType(input.type, COURIER_ISSUE_TYPES);

    if (!input.parcelId) {
      throw new Error('Le colis est requis pour signaler un incident');
    }

    const delivery = await this.db.delivery.findFirst({
      where: { parcelId: input.parcelId, courierId: ctx.userId },
    });
    if (!delivery) {
      throw new AccessDeniedError('Livraison non assignée');
    }

    const parcel = await this.db.parcel.findUniqueOrThrow({ where: { id: input.parcelId } });
    const lockerId = input.lockerId ?? parcel.lockerId ?? undefined;

    if (lockerId) {
      await this.db.locker.findUniqueOrThrow({ where: { id: lockerId } });
    }

    return this.db.issue.create({
      data: {
        type: input.type,
        description: input.description,
        parcelId: input.parcelId,
        lockerId,
        reporterId: ctx.userId!,
      },
      include: issueInclude,
    });
  }

  private assertAllowedType(type: IssueType, allowed: IssueType[]): void {
    if (!allowed.includes(type)) {
      throw new Error('Type d\'incident non autorisé pour ce rôle');
    }
  }
}
