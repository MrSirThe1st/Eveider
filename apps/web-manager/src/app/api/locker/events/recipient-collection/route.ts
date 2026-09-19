import { fail, lockerRecipientCollectionEventSchema, ok } from '@eveider/api-contracts';
import {
  createDataAccessContext,
  createRepositories,
  LockerAuthorizationError,
} from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerApi } from '@/lib/locker-api-session';

export async function POST(request: Request) {
  const auth = requireLockerApi(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = lockerRecipientCollectionEventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { collectionCredentials, parcels } = createRepositories();
    const claim = await collectionCredentials.claimOfflineCollection(auth.lockerId, body.data);
    const parcel = await parcels.collectParcel(
      createDataAccessContext({ platformRole: 'super_admin' }),
      claim.parcelId,
    );
    return NextResponse.json(
      ok({
        collected: true,
        alreadyReported: claim.alreadyClaimed && parcel.status === 'collected',
        parcelId: parcel.id,
        status: parcel.status,
        credentialId: claim.credentialId,
        deviceEventId: body.data.deviceEventId,
      }),
    );
  } catch (err) {
    if (err instanceof LockerAuthorizationError) {
      const status = err.code === 'CREDENTIAL_NOT_FOUND' || err.code === 'PARCEL_NOT_FOUND' ? 404 : 403;
      return NextResponse.json({ success: false, error: err.code, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
