export type CourierListItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isAcceptingWork?: boolean;
  vehicleType?: string | null;
  vehicleMakeModel?: string | null;
};
