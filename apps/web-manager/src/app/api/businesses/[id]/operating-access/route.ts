import { fail, ok, updateOrganizationOperatingAccessSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

function serializeAccess(access: Awaited<
  ReturnType<ReturnType<typeof createRepositories>['businesses']['getOperatingAccess']>
>) {
  return {
    enabledFeatures: access.enabledFeatures,
    dailyShipments: access.dailyShipments,
    monthlyShipments: access.monthlyShipments,
    maxPackageValueUsd: access.maxPackageValueUsd,
    codDailyLimitUsd: access.codDailyLimitUsd,
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { businesses } = createRepositories();
    const access = await businesses.getOperatingAccess(auth.session.ctx, id);
    return NextResponse.json(ok({ access: serializeAccess(access) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateOrganizationOperatingAccessSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id } = await params;

  try {
    const { businesses } = createRepositories();
    const access = await businesses.updateOperatingAccess(auth.session.ctx, id, body.data);
    return NextResponse.json(ok({ access: serializeAccess(access) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
