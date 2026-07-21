import { adminReviewDecisionSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const perf = createRequestTimer('POST /api/businesses/[id]/decision');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id: businessId } = await params;

  const body = await request.json();
  const parsed = adminReviewDecisionSchema.safeParse(body);

  if (!parsed.success) {
    perf.flush(400);
    return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Décision invalide'), {
      status: 400,
    });
  }

  try {
    const { businessOnboarding } = createRepositories();
    const result = await perf.measure('db.applications.decision', () =>
      businessOnboarding.processAdminDecision(auth.session.ctx, businessId, parsed.data),
    );

    perf.flush(200);
    return NextResponse.json(ok(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
