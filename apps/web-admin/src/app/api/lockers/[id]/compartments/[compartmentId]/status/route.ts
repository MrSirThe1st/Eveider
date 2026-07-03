import { fail, ok, updateCompartmentStatusSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerDetailDto } from '@/lib/locker-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string; compartmentId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateCompartmentStatusSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id, compartmentId } = await params;

  try {
    const { lockers } = createRepositories();
    await lockers.updateCompartmentStatus(
      auth.session.ctx,
      id,
      compartmentId,
      body.data.status,
    );

    const locker = await lockers.findById(auth.session.ctx, id);
    if (!locker) {
      return NextResponse.json(fail('Casier introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ locker: toLockerDetailDto(locker) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('Invalid compartment transition') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
