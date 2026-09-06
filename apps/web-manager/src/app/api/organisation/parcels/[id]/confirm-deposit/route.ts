import { confirmMerchantDepositSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toParcelDto } from '@/lib/business-parcel-presenter';
import { requireBusinessSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'manage_operations');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = confirmMerchantDepositSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.confirmMerchantDeposit(
      auth.session.ctx,
      id,
      body.data.compartmentId,
    );
    if (parcel.businessId !== auth.session.profile.businessId) {
      return NextResponse.json(fail('Colis hors périmètre'), { status: 403 });
    }
    return NextResponse.json(ok({ parcel: toParcelDto(parcel) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('n’est pas') ||
      message.includes('requis') ||
      message.includes('indisponible') ||
      message.includes('introuvable') ||
      message.includes('possible')
        ? 400
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
