import type { CustomerParcel } from '@eveider/data-access';
import { createRepositories } from '@eveider/data-access';
import { toCustomerParcelDto, type CustomerParcelDto } from '@/lib/customer-parcel-presenter';
import { toParcelReturnView } from '@/lib/parcel-return-presenter';

export async function buildCustomerParcelDto(
  parcel: CustomerParcel,
  options?: { includeReturnCode?: boolean },
): Promise<CustomerParcelDto> {
  const { payments, parcelReturns, commercial } = createRepositories();
  const [pickupPayment, decision, customerReturn] = await Promise.all([
    payments.getPickupPaymentSummary(parcel.id),
    commercial.evaluateRecipientCollection(parcel.id),
    parcelReturns.findLatestForParcel(parcel.id),
  ]);

  return toCustomerParcelDto(parcel, {
    pickupPayment,
    pickupPaid: decision.pinAuthorized,
    customerReturn: customerReturn
      ? toParcelReturnView(customerReturn, {
          includeReturnCode: options?.includeReturnCode ?? true,
        })
      : null,
  });
}
