import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { businesses } = createRepositories();
    const access = await businesses.applyPlatformOperatingDefaults(auth.session.ctx, id);
    return NextResponse.json(
      ok({
        access: {
          enabledFeatures: access.enabledFeatures,
          dailyShipments: access.dailyShipments,
          monthlyShipments: access.monthlyShipments,
          maxPackageValueUsd: access.maxPackageValueUsd,
          codDailyLimitUsd: access.codDailyLimitUsd,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
