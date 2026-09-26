import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
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
    const { deliveries, platformSettings } = createRepositories();
    const settings = await platformSettings.getSettings();
    const selfAssignmentEnabled = Boolean(settings.driverSelfAssignmentEnabled);

    if (!selfAssignmentEnabled) {
      return withMobileCors(
        NextResponse.json(
          ok({
            selfAssignmentEnabled: false,
            parcels: [],
          }),
        ),
      );
    }

    const parcels = await deliveries.listAvailableForClaim(auth.session.ctx);

    return withMobileCors(
      NextResponse.json(
        ok({
          selfAssignmentEnabled: true,
          parcels: parcels.map((item) => ({
            parcelId: item.parcelId,
            kind: item.kind,
            trackingNumber: item.trackingNumber,
            reference: item.reference,
            businessName: item.businessName,
            senderAddress: item.senderAddress,
            lockerName: item.lockerName,
            lockerAddress: item.lockerAddress,
            dueAt: item.dueAt?.toISOString() ?? null,
            driverInstructions: item.driverInstructions,
          })),
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
