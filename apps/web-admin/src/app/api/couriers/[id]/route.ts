import { fail, ok } from '@eveider/api-contracts';
import { prisma } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const courier = await prisma.user.findUnique({
      where: { id },
    });

    if (!courier || courier.role !== 'courier') {
      return NextResponse.json(fail('Coursier introuvable'), { status: 404 });
    }

    const deliveries = await prisma.delivery.findMany({
      where: { courierId: id },
      include: {
        parcel: {
          include: {
            locker: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate delivery stats
    const total = deliveries.length;
    const completed = deliveries.filter((d) => d.status === 'completed').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;
    const inProgress = deliveries.filter((d) =>
      ['assigned', 'scanned', 'drop_off_pending'].includes(d.status)
    ).length;

    return NextResponse.json(
      ok({
        courier: {
          id: courier.id,
          fullName: courier.fullName,
          email: courier.email,
          phone: courier.phone,
          isBlocked: courier.isBlocked,
          createdAt: courier.createdAt.toISOString(),
        },
        stats: {
          total,
          completed,
          failed,
          inProgress,
        },
        deliveries: deliveries.map((d) => ({
          id: d.id,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          completedAt: d.completedAt ? d.completedAt.toISOString() : null,
          parcel: {
            id: d.parcel.id,
            reference: d.parcel.reference,
            businessName: d.parcel.business.name,
            locker: d.parcel.locker
              ? {
                  name: d.parcel.locker.name,
                  address: d.parcel.locker.address,
                }
              : null,
          },
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
