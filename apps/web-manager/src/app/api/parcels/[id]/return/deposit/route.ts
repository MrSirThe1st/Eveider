import { confirmRecipientReturnDepositSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const body = confirmRecipientReturnDepositSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { parcelReturns } = createRepositories();
    const updated = await parcelReturns.confirmRecipientDeposit(auth.session.ctx, id, body.data);
    return NextResponse.json(ok({ return: { id: updated.id, status: updated.status } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('autoris') ||
      message.includes('casier') ||
      message.includes('Code') ||
      message.includes('possible') ||
      message.includes('introuvable')
        ? 400
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
