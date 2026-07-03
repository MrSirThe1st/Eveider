import { fail, listIssuesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toIssueDto } from '@/lib/issue-presenter';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listIssuesQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail('Filtre de statut invalide'), { status: 400 });
  }

  try {
    const { issues } = createRepositories();
    const items = await issues.listAll(
      auth.session.ctx,
      query.data.status ? { status: query.data.status } : undefined,
    );

    return NextResponse.json(ok({ issues: items.map(toIssueDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
