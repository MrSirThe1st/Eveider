import { describe, expect, it } from 'vitest';
import { toCourierDeliveryDto } from './courier-delivery-presenter';

const now = new Date('2026-09-19T10:00:00.000Z');

function delivery(kind: 'outbound' | 'return' | 'customer_return') {
  return {
    id: 'd1',
    status: 'assigned' as const,
    kind,
    scannedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    hasDropOffPhoto: false,
    parcel: {
      id: 'p1',
      trackingNumber: 'EVD26TEST0001A',
      reference: null,
      status: 'created',
      recipientName: 'Amina',
      senderAddress: '12 Avenue du Commerce',
      senderName: 'Mulikap',
      senderPhone: '+2430551609849',
      senderLocationName: 'Entrepôt principal',
      senderLat: -10.71,
      senderLng: 25.47,
      senderInstructions: 'Entrée arrière, portail bleu',
      packageSize: 'medium' as const,
      business: { name: 'Entreprise ABC' },
      locker: {
        id: 'l1',
        name: 'Gombe',
        address: 'Boulevard du 30 Juin',
        latitude: -4.3,
        longitude: 15.3,
        status: 'active' as const,
      },
      compartment: null,
    },
  };
}

describe('toCourierDeliveryDto', () => {
  it('exposes sender address and package size for Driver origin display', () => {
    const dto = toCourierDeliveryDto(delivery('outbound'));
    expect(dto.parcel.senderAddress).toBe('12 Avenue du Commerce');
    expect(dto.parcel.senderName).toBe('Mulikap');
    expect(dto.parcel.senderPhone).toBe('+2430551609849');
    expect(dto.parcel.senderLocationName).toBe('Entrepôt principal');
    expect(dto.parcel.senderLat).toBe(-10.71);
    expect(dto.parcel.senderLng).toBe(25.47);
    expect(dto.parcel.senderInstructions).toBe('Entrée arrière, portail bleu');
    expect(dto.parcel.packageSize).toBe('medium');
    expect(dto.kindLabel).toBe('Aller');
  });

  it('labels customer_return as Retour client', () => {
    expect(toCourierDeliveryDto(delivery('customer_return')).kindLabel).toBe('Retour client');
  });

  it('labels historical RTS distinctly from customer return', () => {
    expect(toCourierDeliveryDto(delivery('return')).kindLabel).toBe(
      'Retour non retiré (historique)',
    );
  });
});
