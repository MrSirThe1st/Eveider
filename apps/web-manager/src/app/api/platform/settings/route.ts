import { fail, ok, updatePlatformSettingsSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

function serializeSettings(row: Awaited<ReturnType<ReturnType<typeof createRepositories>['platformSettings']['getSettings']>>) {
  return {
    id: row.id,
    pickupFeeAmount: row.pickupFeeAmount,
    pickupFeeCurrency: row.pickupFeeCurrency,
    requireOrgApproval: row.requireOrgApproval,
    defaultDailyShipments: row.defaultDailyShipments,
    defaultMonthlyShipments: row.defaultMonthlyShipments,
    defaultMaxPackageValueUsd: row.defaultMaxPackageValueUsd,
    defaultCodDailyLimitUsd: row.defaultCodDailyLimitUsd,
    defaultEnabledFeatures: row.defaultEnabledFeatures,
    supportPhone: row.supportPhone,
    dispatcherWhatsapp: row.dispatcherWhatsapp,
    updatedAt: row.updatedAt.toISOString(),
    pawapayConfigured: Boolean(process.env.PAWAPAY_API_TOKEN?.trim()),
  };
}

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { platformSettings } = createRepositories();
    const settings = await platformSettings.getSettings();
    return NextResponse.json(ok({ settings: serializeSettings(settings) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updatePlatformSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { platformSettings } = createRepositories();
    const settings = await platformSettings.updateSettings(auth.session.ctx, body.data);
    return NextResponse.json(ok({ settings: serializeSettings(settings) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
