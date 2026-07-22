import { fail, ok, updateIssueStatusSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toIssueDto } from '@/lib/issue-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateIssueStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail(parsed.error.issues[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { issues } = createRepositories();
    const issue = await issues.updateStatus(auth.session.ctx, id, parsed.data.status);

    return NextResponse.json(ok({ issue: toIssueDto(issue) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('transition') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
