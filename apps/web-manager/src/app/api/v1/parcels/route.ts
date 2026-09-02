import { createParcelSchema, fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import {
  createOrganisationParcel,
  organisationParcelCreateStatus,
} from '@/lib/create-organisation-parcel';
import { requireOrgApiKey } from '@/lib/org-api-session';

export async function POST(request: Request) {
  const auth = await requireOrgApiKey(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createParcelSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const result = await createOrganisationParcel(auth.session.ctx, auth.session.businessId, body.data);
    return NextResponse.json(
      ok({
        parcel: result.parcel,
        recipientStatus: result.recipientStatus,
        invite: result.invite,
      }),
      { status: 201 },
    );
  } catch (err) {
    const { status, message } = organisationParcelCreateStatus(err);
    return NextResponse.json(fail(message), { status });
  }
}
