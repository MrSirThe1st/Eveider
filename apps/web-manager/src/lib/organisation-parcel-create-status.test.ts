import { describe, expect, it } from 'vitest';
import { ZONE_PRICING_NOT_CONFIGURED_MESSAGE } from '@eveider/domain';
import { organisationParcelCreateStatus } from './organisation-parcel-create-status';

describe('organisationParcelCreateStatus', () => {
  it('maps unconfigured zone pricing to a business-facing message', () => {
    expect(organisationParcelCreateStatus(new Error(ZONE_PRICING_NOT_CONFIGURED_MESSAGE))).toEqual({
      status: 409,
      message:
        'La livraison Eveider n’est pas encore disponible pour ce casier. Choisissez un autre casier ou contactez Eveider.',
    });
  });

  it('maps inactive or missing zone errors the same way', () => {
    const expected =
      'La livraison Eveider n’est pas encore disponible pour ce casier. Choisissez un autre casier ou contactez Eveider.';
    expect(organisationParcelCreateStatus(new Error('Zone tarifaire introuvable pour ce casier'))).toEqual(
      { status: 409, message: expected },
    );
    expect(
      organisationParcelCreateStatus(new Error('Cette zone de service n’est plus active')),
    ).toEqual({ status: 409, message: expected });
    expect(organisationParcelCreateStatus(new Error('Cette ville n’est plus active'))).toEqual({
      status: 409,
      message: expected,
    });
  });
});
