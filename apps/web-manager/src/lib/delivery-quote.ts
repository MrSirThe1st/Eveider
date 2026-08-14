import { formatDeliveryFeeFc, type PackageSize } from '@eveider/domain';
import {
  createRepositories,
  distanceKmToLocker,
  getPool,
  resolveBusinessPickupCoordinates,
  toDeliveryPricingRules,
} from '@eveider/data-access';

export type DeliveryQuoteInput = {
  businessId: string;
  lockerId: string;
  compartmentId?: string;
  packageSize: PackageSize;
  senderAddress?: string | null;
};

export type DeliveryQuoteResult = {
  deliveryFeeFc: number;
  deliveryDistanceKm: number;
  pricingSizeUsed: PackageSize;
  deliveryFeeLabel: string;
};

export async function buildDeliveryQuote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
  const { pricing } = createRepositories();
  const pool = getPool();

  const rulesRow = await pricing.getDeliveryRules();
  const lockerResult = await pool.query(
    `SELECT latitude, longitude FROM lockers WHERE id = $1 LIMIT 1`,
    [input.lockerId],
  );
  const lockerRow = lockerResult.rows[0];
  if (!lockerRow) {
    throw new Error('Point de retrait introuvable');
  }

  let pricingSizeUsed: PackageSize = input.packageSize;
  if (input.compartmentId) {
    const compartmentResult = await pool.query(
      `SELECT size FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
      [input.compartmentId, input.lockerId],
    );
    const size = compartmentResult.rows[0]?.size;
    if (size === 'small' || size === 'medium' || size === 'large') {
      pricingSizeUsed = size;
    }
  }

  const pickup = await resolveBusinessPickupCoordinates(
    pool,
    input.businessId,
    input.senderAddress,
  );
  const locker = {
    latitude: lockerRow.latitude == null ? null : Number(lockerRow.latitude),
    longitude: lockerRow.longitude == null ? null : Number(lockerRow.longitude),
  };
  const deliveryDistanceKm =
    pickup && locker.latitude != null && locker.longitude != null
      ? (distanceKmToLocker(pickup, locker) ?? 0)
      : 0;

  const deliveryFeeFc = pricing.quoteDeliveryFee(
    deliveryDistanceKm,
    pricingSizeUsed,
    rulesRow,
  );

  return {
    deliveryFeeFc,
    deliveryDistanceKm: Math.round(deliveryDistanceKm * 100) / 100,
    pricingSizeUsed,
    deliveryFeeLabel: formatDeliveryFeeFc(deliveryFeeFc),
  };
}
