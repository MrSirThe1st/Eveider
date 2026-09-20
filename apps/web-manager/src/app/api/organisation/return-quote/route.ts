import { fail, ok, returnQuoteQuerySchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { formatDeliveryFee } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { getBusinessChargeLabel } from '@/lib/business-presentation';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession(undefined, 'manage_operations');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = returnQuoteQuerySchema.safeParse({
    method: searchParams.get('method') ?? undefined,
    returnLockerId: searchParams.get('returnLockerId') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail(query.error.errors[0]?.message ?? 'Paramètres invalides'), {
      status: 400,
    });
  }

  try {
    const { commercial } = createRepositories();
    const quoted = await commercial.quoteReturn({
      method: query.data.method,
      returnLockerId: query.data.returnLockerId,
    });
    return NextResponse.json(
      ok({
        kind: quoted.kind,
        payer: quoted.payer,
        amount: quoted.amount,
        currency: quoted.currency,
        feeLabel: formatDeliveryFee(quoted.amount, quoted.currency),
        kindLabel: getBusinessChargeLabel(quoted.kind),
        zoneCode: quoted.zoneCode,
        zoneName: quoted.zoneName,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
