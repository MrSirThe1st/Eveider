import { fail, ok } from '@eveider/api-contracts';
import { createRepositories, deliverSignedNotification } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function POST() {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { businesses, organizationApi } = createRepositories();
  const allowed = await businesses.hasFeatureEnabled(auth.session.profile.businessId, 'API_ACCESS');
  if (!allowed) {
    return NextResponse.json(
      fail("Eveider n'a pas activé la connexion à un logiciel pour votre entreprise."),
      { status: 403 },
    );
  }

  const endpoint = await organizationApi.getEndpoint(auth.session.profile.businessId);
  if (!endpoint?.url) {
    return NextResponse.json(fail("Enregistrez d'abord une adresse de notification."), {
      status: 400,
    });
  }

  const payload = {
    id: 'test',
    type: 'eveider.test',
    createdAt: new Date().toISOString(),
    parcel: null,
    previousParcelStatus: null,
    newParcelStatus: null,
    previousDeliveryStatus: null,
    newDeliveryStatus: null,
  };

  const result = await deliverSignedNotification({
    url: endpoint.url,
    signingSecret: endpoint.signingSecret,
    eventType: 'eveider.test',
    payload,
  });

  await organizationApi.logTestDelivery(endpoint.id, result);

  if (!result.ok) {
    return NextResponse.json(
      fail(result.error ?? "L'essai n'a pas abouti"),
      { status: 502 },
    );
  }

  return NextResponse.json(ok({ sent: true, httpStatus: result.httpStatus }));
}
