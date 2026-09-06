import type { UserRole } from '@eveider/domain';
import { CustomerNavigator } from './CustomerNavigator';
import { CourierNavigator } from './CourierNavigator';

type MobileTabsProps = {
  role: UserRole | 'courier';
  initialParcelId?: string;
  isGuest?: boolean;
  onRequestAuth?: (mode?: 'login' | 'register') => void;
};

function isDriverRole(role: UserRole | 'courier') {
  return role === 'courier' || role === 'driver';
}

export function MobileTabs({ role, initialParcelId, isGuest = false, onRequestAuth }: MobileTabsProps) {
  if (isDriverRole(role)) {
    return <CourierNavigator onRequestAuth={onRequestAuth} />;
  }

  return (
    <CustomerNavigator
      initialParcelId={initialParcelId}
      isGuest={isGuest}
      onRequestAuth={onRequestAuth}
    />
  );
}
