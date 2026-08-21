import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

/** Prefill sender + default pickup type for Create Shipment. */
export async function GET() {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const businessId = auth.session.profile.businessId!;
    const { businesses } = createRepositories();
    const business = await businesses.findById(auth.session.ctx, businessId);
    if (!business) {
      return NextResponse.json(fail('Entreprise introuvable'), { status: 404 });
    }

    const { getPool } = await import('@eveider/data-access');
    const pool = getPool();
    const location = await pool.query(
      `SELECT pickup_method, street, contact_person, contact_phone, dropoff_locker_id
       FROM business_locations
       WHERE business_id = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [businessId],
    );
    const row = location.rows[0];

    return NextResponse.json(
      ok({
        senderName: business.name,
        senderPhone: business.contactPhone ?? '',
        senderAddress: row?.street ? String(row.street) : business.residentialAddress,
        pickupType:
          row?.pickup_method === 'merchant_dropoff' ? 'merchant_dropoff' : 'courier_pickup',
        dropoffLockerId: row?.dropoff_locker_id ? String(row.dropoff_locker_id) : null,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
