export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  apiVersion: string;
  templateLanguage: string;
  inTransitTemplate: string;
  arrivedTemplate: string;
};

/** Returns null when WhatsApp is not configured (local/dev without credentials). */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'fr',
    inTransitTemplate:
      process.env.WHATSAPP_PARCEL_IN_TRANSIT_TEMPLATE?.trim() || 'eveider_parcel_in_transit',
    arrivedTemplate:
      process.env.WHATSAPP_PARCEL_ARRIVED_TEMPLATE?.trim() || 'eveider_parcel_arrived',
  };
}

/** WhatsApp Cloud API expects digits only (country code, no +). */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
