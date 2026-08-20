import { createIssueSchema, fail, listIssuesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toIssueDto } from '@/lib/issue-presenter';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession();
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

  const parcelId = searchParams.get('parcelId');
  if (parcelId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parcelId)) {
    return NextResponse.json(fail('Colis invalide'), { status: 400 });
  }

  try {
    const { issues } = createRepositories();
    const items = await issues.listForBusiness(auth.session.ctx, {
      status: query.data.status,
      parcelId: parcelId || undefined,
    });
    return NextResponse.json(ok({ issues: items.map(toIssueDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(fail(parsed.error.issues[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { issues } = createRepositories();
    const issue = await issues.create(auth.session.ctx, parsed.data);
    return NextResponse.json(ok({ issue: toIssueDto(issue) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('scope') || message.includes('requis') || message.includes('autorisé')
        ? 403
        : message.includes('introuvable') || message.includes('not found')
          ? 404
          : 500;
    return NextResponse.json(fail(message), { status });
  }
}
