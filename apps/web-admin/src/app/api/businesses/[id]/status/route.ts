import { fail, ok, updateBusinessStatusSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toBusinessDto } from '@/lib/business-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateBusinessStatusSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id } = await params;

  try {
    const { businesses } = createRepositories();
    const business = await businesses.updateStatus(auth.session.ctx, id, body.data.status);

    return NextResponse.json(ok({ business: toBusinessDto(business) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('Invalid business transition') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
