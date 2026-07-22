import { fail, ok, courierDetailResponseSchema } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { getCourierDetail } from '@/server/couriers';
import { requireAdminSession } from '@/lib/session';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const detail = await getCourierDetail(auth.session.ctx, id);
    if (!detail) {
      return NextResponse.json(fail('Coursier introuvable'), { status: 404 });
    }

    const response = courierDetailResponseSchema.parse(detail);
    return NextResponse.json(ok(response));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
