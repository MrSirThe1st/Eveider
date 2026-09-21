import { fail, ok } from '@eveider/api-contracts';
import {
  buildPawaPayConfig,
  createRepositories,
  DRC_DEPOSIT_PROVIDERS,
  listPawaPayDepositProviders,
} from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { platformSettings } = createRepositories();
  const settings = await platformSettings.getSettings();
  const config = buildPawaPayConfig({
    amount: String(settings.pickupFeeAmount),
    currency: settings.platformCurrency,
  });
  if (!config) {
    return withMobileCors(
      NextResponse.json(fail('Paiement mobile indisponible pour le moment'), { status: 503 }),
    );
  }

  const remoteProviders = await listPawaPayDepositProviders();
  const providers =
    remoteProviders.length > 0
      ? remoteProviders
      : DRC_DEPOSIT_PROVIDERS.map((provider) => ({
          id: provider.id,
          label: provider.label,
        }));

  return withMobileCors(
    NextResponse.json(
      ok({
        amount: config.pickupFeeAmount,
        currency: config.pickupFeeCurrency,
        country: config.country,
        providers,
      }),
    ),
  );
}
