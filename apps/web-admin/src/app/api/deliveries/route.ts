import { fail, listDeliveriesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminDeliveryDto } from '@/lib/admin-delivery-presenter';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listDeliveriesQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    courierId: searchParams.get('courierId') ?? undefined,
    lockerId: searchParams.get('lockerId') ?? undefined,
    businessId: searchParams.get('businessId') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail('Filtres invalides'), { status: 400 });
  }

  try {
    const { deliveries } = createRepositories();
    const [items, summary] = await Promise.all([
      deliveries.listForAdmin(auth.session.ctx, query.data),
      deliveries.getActiveSummary(auth.session.ctx),
    ]);

    return NextResponse.json(
      ok({
        deliveries: items.map(toAdminDeliveryDto),
        summary,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
