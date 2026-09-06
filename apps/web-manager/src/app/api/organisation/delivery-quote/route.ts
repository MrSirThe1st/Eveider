import { deliveryQuoteQuerySchema, fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { buildDeliveryQuote } from '@/lib/delivery-quote';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = deliveryQuoteQuerySchema.safeParse({
    lockerId: searchParams.get('lockerId') ?? undefined,
    compartmentId: searchParams.get('compartmentId') ?? undefined,
    packageSize: searchParams.get('packageSize') ?? undefined,
    senderAddress: searchParams.get('senderAddress') ?? undefined,
    pickupType: searchParams.get('pickupType') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail(query.error.errors[0]?.message ?? 'Paramètres invalides'), {
      status: 400,
    });
  }

  try {
    const quote = await buildDeliveryQuote({
      businessId: auth.session.profile.businessId!,
      lockerId: query.data.lockerId,
      compartmentId: query.data.compartmentId,
      packageSize: query.data.packageSize,
      senderAddress: query.data.senderAddress,
      pickupType: query.data.pickupType,
    });
    return NextResponse.json(ok(quote));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
