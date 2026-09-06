import { formatDeliveryFee, type DeliveryPricingCurrency, type PackageSize, type ShipmentPickupType } from '@eveider/domain';
import {
  createRepositories,
  distanceKmToLocker,
  getPool,
  quoteForPickupType,
  resolveBusinessPickupCoordinates,
} from '@eveider/data-access';

export type DeliveryQuoteInput = {
  businessId: string;
  lockerId: string;
  compartmentId?: string;
  packageSize: PackageSize;
  senderAddress?: string | null;
  pickupType?: ShipmentPickupType;
};

export type DeliveryQuoteResult = {
  deliveryFeeAmount: number;
  deliveryFeeCurrency: DeliveryPricingCurrency;
  /** @deprecated Prefer deliveryFeeAmount */
  deliveryFeeFc: number;
  deliveryDistanceKm: number;
  pricingSizeUsed: PackageSize | null;
  deliveryFeeLabel: string;
  chargeKind: 'delivery_fee' | 'drop_off_fee';
  /** True when fee is informational until deposit (merchant drop-off). */
  feeChargedOnDeposit: boolean;
};

export async function buildDeliveryQuote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
  const { pricing } = createRepositories();
  const pool = getPool();
  const pickupType = input.pickupType ?? 'courier_pickup';

  const rulesRow = await pricing.getDeliveryRules();

  if (pickupType === 'merchant_dropoff') {
    const quoted = quoteForPickupType({
      pickupType,
      distanceKm: 0,
      size: input.packageSize,
      rules: rulesRow,
    });
    return {
      deliveryFeeAmount: quoted.feeAmount,
      deliveryFeeCurrency: quoted.feeCurrency,
      deliveryFeeFc: quoted.feeAmount,
      deliveryDistanceKm: 0,
      pricingSizeUsed: null,
      deliveryFeeLabel: formatDeliveryFee(quoted.feeAmount, quoted.feeCurrency),
      chargeKind: 'drop_off_fee',
      feeChargedOnDeposit: true,
    };
  }

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

  const quoted = quoteForPickupType({
    pickupType: 'courier_pickup',
    distanceKm: deliveryDistanceKm,
    size: pricingSizeUsed,
    rules: rulesRow,
  });

  return {
    deliveryFeeAmount: quoted.feeAmount,
    deliveryFeeCurrency: quoted.feeCurrency,
    deliveryFeeFc: quoted.feeAmount,
    deliveryDistanceKm: quoted.deliveryDistanceKm,
    pricingSizeUsed,
    deliveryFeeLabel: formatDeliveryFee(quoted.feeAmount, quoted.feeCurrency),
    chargeKind: 'delivery_fee',
    feeChargedOnDeposit: false,
  };
}
