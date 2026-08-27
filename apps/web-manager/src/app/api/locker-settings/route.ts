import { fail, ok, updateLockerNetworkSettingsSchema } from '@eveider/api-contracts';
import { createRepositories, toLockerNetworkSettings } from '@eveider/data-access';
import { NETWORK_SIZE_DEFINITIONS } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { lockerSettings } = createRepositories();
    const row = await lockerSettings.getNetworkSettings();
    return NextResponse.json(
      ok({
        settings: {
          id: row.id,
          ...toLockerNetworkSettings(row),
          updatedAt: row.updatedAt.toISOString(),
          sizeDefinitions: NETWORK_SIZE_DEFINITIONS,
        },
      }),
    );
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

  const body = updateLockerNetworkSettingsSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockerSettings } = createRepositories();
    const row = await lockerSettings.updateNetworkSettings(auth.session.ctx, body.data);
    return NextResponse.json(
      ok({
        settings: {
          id: row.id,
          ...toLockerNetworkSettings(row),
          updatedAt: row.updatedAt.toISOString(),
          sizeDefinitions: NETWORK_SIZE_DEFINITIONS,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
