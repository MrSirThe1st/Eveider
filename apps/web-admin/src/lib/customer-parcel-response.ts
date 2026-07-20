import type { CustomerParcel } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import { toCustomerParcelDto, type CustomerParcelDto } from '@/lib/customer-parcel-presenter';

export async function buildCustomerParcelDto(parcel: CustomerParcel): Promise<CustomerParcelDto> {
  const { payments } = createRepositories();
  const pickupPayment = await payments.getPickupPaymentSummary(parcel.id);
  const pickupPaid = await payments.hasCompletedPickupPayment(parcel.id);

  return toCustomerParcelDto(parcel, { pickupPayment, pickupPaid });
}
