import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';

export type BusinessDto = {
  id: string;
  name: string;
  status: BusinessStatus;
  statusLabel: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toBusinessDto(business: {
  id: string;
  name: string;
  status: BusinessStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BusinessDto {
  return {
    id: business.id,
    name: business.name,
    status: business.status,
    statusLabel: BUSINESS_STATUS_LABELS[business.status],
    contactEmail: business.contactEmail,
    contactPhone: business.contactPhone,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}
