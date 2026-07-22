import { ok } from '@eveider/api-contracts';
import {
  DRC_DEPOSIT_PROVIDERS,
  getPawaPayConfig,
  listPawaPayDepositProviders,
} from '@eveider/data-access';
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

  const remoteProviders = await listPawaPayDepositProviders();
  const providers =
    remoteProviders.length > 0
      ? remoteProviders.map((provider) => provider.id)
      : DRC_DEPOSIT_PROVIDERS.map((provider) => provider.id);

  return NextResponse.json(
    ok({
      required: true,
      amount: config.pickupFeeAmount,
      currency: config.pickupFeeCurrency,
      providers,
    }),
  );
}
