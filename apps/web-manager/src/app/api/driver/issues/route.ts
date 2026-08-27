import { createIssueSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toIssueDto } from '@/lib/issue-presenter';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { issues } = createRepositories();
    const items = await issues.listForReporter(auth.session.ctx);

    return withMobileCors(
      NextResponse.json(ok({ issues: items.map(toIssueDto) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}

export async function POST(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);

  if (!parsed.success) {
    return withMobileCors(
      NextResponse.json(fail(parsed.error.issues[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { issues } = createRepositories();
    const issue = await issues.create(auth.session.ctx, parsed.data);

    return withMobileCors(NextResponse.json(ok({ issue: toIssueDto(issue) })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('scope') || message.includes('assignée') || message.includes('requis')
        ? 403
        : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
