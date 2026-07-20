import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import type { Notification, Parcel, PrismaClient } from '@prisma/client';
import { AccessDeniedError, assertCustomerRole, type DataAccessContext } from '../context.js';
import { sendParcelStatusWhatsApp } from '../messaging/parcel-whatsapp.js';

export type CustomerNotification = Notification & {
  parcel: { id: string; reference: string } | null;
};

const CUSTOMER_NOTIFY_STATUSES: ParcelStatus[] = [
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
  'collected',
];

export class NotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async notifyParcelCreatedForCustomer(
    parcelId: string,
    userId: string,
    businessName: string,
  ): Promise<void> {
    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: { reference: true },
    });
    if (!parcel) return;

    const message = `${businessName} vous a envoyé un colis prêt pour retrait.`;

    const duplicate = await this.db.notification.findFirst({
      where: { userId, parcelId, message, channel: 'in_app' },
    });
    if (duplicate) return;

    await this.db.notification.create({
      data: {
        userId,
        parcelId,
        channel: 'in_app',
        message,
      },
    });
  }

  async notifyParcelStatusChange(parcelId: string, newStatus: ParcelStatus): Promise<void> {
    if (!CUSTOMER_NOTIFY_STATUSES.includes(newStatus)) return;

    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      include: { locker: { select: { name: true } } },
    });
    if (!parcel) return;

    const userId = await this.resolveCustomerUserId(parcel);
    if (userId) {
      const message = this.buildMessage(parcel.reference, newStatus, parcel.locker?.name);

      const duplicate = await this.db.notification.findFirst({
        where: { userId, parcelId, message, channel: 'in_app' },
      });
      if (!duplicate) {
        await this.db.notification.create({
          data: {
            userId,
            parcelId,
            channel: 'in_app',
            message,
          },
        });
      }
    }

    // Phone-first WhatsApp — works even if the recipient has no app account yet.
    try {
      await sendParcelStatusWhatsApp(this.db, parcelId, newStatus);
    } catch (error) {
      console.error('[eveider:whatsapp] unexpected error', { parcelId, newStatus, error });
    }
  }

  async listForCustomer(ctx: DataAccessContext): Promise<CustomerNotification[]> {
    assertCustomerRole(ctx);

    return this.db.notification.findMany({
      where: { userId: ctx.userId!, channel: 'in_app' },
      include: { parcel: { select: { id: true, reference: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unreadCount(ctx: DataAccessContext): Promise<number> {
    assertCustomerRole(ctx);

    return this.db.notification.count({
      where: { userId: ctx.userId!, channel: 'in_app', sentAt: null },
    });
  }

  async markRead(ctx: DataAccessContext, id: string): Promise<CustomerNotification> {
    assertCustomerRole(ctx);

    const notification = await this.db.notification.findUniqueOrThrow({ where: { id } });
    if (notification.userId !== ctx.userId) {
      throw new AccessDeniedError('Notification hors périmètre');
    }

    return this.db.notification.update({
      where: { id },
      data: { sentAt: notification.sentAt ?? new Date() },
      include: { parcel: { select: { id: true, reference: true } } },
    });
  }

  private async resolveCustomerUserId(parcel: Pick<Parcel, 'customerId' | 'recipientPhone'>) {
    if (parcel.customerId) return parcel.customerId;

    const user = await this.db.user.findFirst({
      where: { phone: parcel.recipientPhone, role: 'customer' },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private buildMessage(reference: string, status: ParcelStatus, lockerName?: string | null) {
    const label = PARCEL_STATUS_LABELS[status];
    if (status === 'ready_for_pickup' && lockerName) {
      return `Colis ${reference} — ${label} · ${lockerName}`;
    }
    return `Colis ${reference} — ${label}`;
  }
}
