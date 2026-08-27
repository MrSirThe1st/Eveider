import { Linking } from 'react-native';

export const EVEIDER_SUPPORT_PHONE = '+243810000000';
export const EVEIDER_SUPPORT_PHONE_LABEL = '+243 81 000 0000';

const DISPATCHER_WHATSAPP =
  process.env.EXPO_PUBLIC_DISPATCHER_WHATSAPP?.replace(/\D/g, '') ||
  EVEIDER_SUPPORT_PHONE.replace(/\D/g, '');

export function callEveiderSupport() {
  void Linking.openURL(`tel:${EVEIDER_SUPPORT_PHONE}`);
}

export type DispatcherWhatsAppContext = {
  trackingNumber?: string | null;
  lockerName?: string | null;
  statusLabel?: string | null;
};

export function openDispatcherWhatsApp(context?: DispatcherWhatsAppContext) {
  const lines = ['Bonjour Dispatch Eveider,'];
  if (context?.trackingNumber) {
    lines.push(`Livraison ${context.trackingNumber}`);
  }
  if (context?.lockerName) {
    lines.push(`Casier : ${context.lockerName}`);
  }
  if (context?.statusLabel) {
    lines.push(`Statut : ${context.statusLabel}`);
  }
  lines.push('Merci.');
  const url = `https://wa.me/${DISPATCHER_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  void Linking.openURL(url);
}
