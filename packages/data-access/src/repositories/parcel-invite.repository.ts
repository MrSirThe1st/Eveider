import type { ParcelInvite, PrismaClient } from '@prisma/client';
import { AccessDeniedError, assertBusinessScope, type DataAccessContext } from '../context.js';
import {
  getInviteExpiryDate,
  recordInviteDelivery,
  sendInvitation,
} from '../invitations/invitation.service.js';
import { buildInviteLinks } from '../invitations/invite-links.js';

export type InvitePreview = {
  business: string;
  recipientPhone: string;
  recipientName: string | null;
  parcel: {
    id: string;
    reference: string;
    locker: string | null;
  };
};

export type InviteDeliveryInfo = {
  status: 'pending' | 'accepted' | 'expired';
  deepLink: string;
  webLink: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export class ParcelInviteRepository {
  constructor(private readonly db: PrismaClient) {}

  async createForParcel(
    parcelId: string,
    phone: string,
    email?: string | null,
  ): Promise<ParcelInvite> {
    return this.db.parcelInvite.create({
      data: {
        parcelId,
        phone,
        email: email ?? undefined,
        expiresAt: getInviteExpiryDate(),
      },
    });
  }

  async findByToken(token: string) {
    return this.db.parcelInvite.findUnique({
      where: { token },
      include: {
        parcel: {
          include: {
            business: { select: { name: true } },
            locker: { select: { name: true } },
          },
        },
      },
    });
  }

  async getPreview(token: string): Promise<InvitePreview | null> {
    const invite = await this.findByToken(token);
    if (!invite) return null;

    if (invite.status === 'accepted') {
      throw new Error('Cette invitation a déjà été utilisée');
    }

    if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      if (invite.status !== 'expired') {
        await this.db.parcelInvite.update({
          where: { id: invite.id },
          data: { status: 'expired' },
        });
      }
      throw new Error('Cette invitation a expiré');
    }

    return {
      business: invite.parcel.business.name,
      recipientPhone: invite.phone,
      recipientName: invite.parcel.recipientName,
      parcel: {
        id: invite.parcel.id,
        reference: invite.parcel.reference,
        locker: invite.parcel.locker?.name ?? null,
      },
    };
  }

  async accept(token: string, userId: string, userPhone?: string | null): Promise<void> {
    const invite = await this.findByToken(token);
    if (!invite) {
      throw new Error('Invitation introuvable');
    }

    if (invite.status === 'accepted') {
      if (invite.parcel.customerId === userId) return;
      throw new Error('Cette invitation a déjà été utilisée');
    }

    if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      throw new Error('Cette invitation a expiré');
    }

    if (userPhone && invite.phone !== userPhone) {
      throw new Error('Le numéro de téléphone ne correspond pas à l\'invitation');
    }

    await this.db.$transaction([
      this.db.parcel.update({
        where: { id: invite.parcelId },
        data: { customerId: userId },
      }),
      this.db.parcel.updateMany({
        where: { recipientPhone: invite.phone, customerId: null },
        data: { customerId: userId },
      }),
      this.db.parcelInvite.update({
        where: { id: invite.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      }),
    ]);
  }

  async getForParcel(ctx: DataAccessContext, parcelId: string): Promise<InviteDeliveryInfo | null> {
    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      select: { businessId: true },
    });
    if (!parcel) return null;
    assertBusinessScope(ctx, parcel.businessId);

    const invite = await this.db.parcelInvite.findUnique({ where: { parcelId } });
    if (!invite) return null;

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    };
  }

  async resend(ctx: DataAccessContext, parcelId: string): Promise<InviteDeliveryInfo> {
    const parcel = await this.db.parcel.findUnique({
      where: { id: parcelId },
      include: { business: { select: { name: true } } },
    });
    if (!parcel) {
      throw new Error('Colis introuvable');
    }
    assertBusinessScope(ctx, parcel.businessId);

    if (parcel.customerId) {
      throw new Error('Le destinataire a déjà un compte Eveider');
    }

    let invite = await this.db.parcelInvite.findUnique({ where: { parcelId } });
    if (!invite) {
      invite = await this.createForParcel(parcelId, parcel.recipientPhone);
    } else if (invite.status === 'accepted') {
      throw new Error('L\'invitation a déjà été acceptée');
    } else if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      invite = await this.db.parcelInvite.update({
        where: { id: invite.id },
        data: {
          status: 'pending',
          expiresAt: getInviteExpiryDate(),
          acceptedAt: null,
        },
      });
    }

    const delivery = await sendInvitation({
      token: invite.token,
      phone: invite.phone,
      email: invite.email,
      businessName: parcel.business.name,
      parcelReference: parcel.reference,
    });

    await recordInviteDelivery(this.db, parcelId, delivery);

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    };
  }

  async dispatchForNewParcel(
    parcelId: string,
    phone: string,
    email: string | null | undefined,
    businessName: string,
    parcelReference: string,
  ): Promise<InviteDeliveryInfo> {
    const invite = await this.createForParcel(parcelId, phone, email);

    const delivery = await sendInvitation({
      token: invite.token,
      phone,
      email,
      businessName,
      parcelReference,
    });

    await recordInviteDelivery(this.db, parcelId, delivery);

    const links = buildInviteLinks(invite.token);
    return {
      status: invite.status,
      deepLink: links.deepLink,
      webLink: links.webLink,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: null,
    };
  }
}
