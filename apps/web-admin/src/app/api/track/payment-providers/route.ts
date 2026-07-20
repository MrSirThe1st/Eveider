import { ok } from '@eveider/api-contracts';
import { getPawaPayConfig, listPawaPayDepositProviders } from '@eveider/data-access';
import { NextResponse } from 'next/server';

/** Public — guest track page needs fee + operators without login. */
export async function GET() {
  const config = getPawaPayConfig();
  if (!config) {
    return NextResponse.json(
      ok({
        required: false,
        amount: null as string | null,
        currency: null as string | null,
        providers: [] as string[],
      }),
    );
  }

  return NextResponse.json(
    ok({
      required: true,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      providers: listPawaPayDepositProviders(),
    }),
  );
}
