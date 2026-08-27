import { createContext, useContext } from 'react';

export type AuthIntent = 'login' | 'register';

export type CustomerSettingsScreen =
  | 'Notifications'
  | 'NotificationPreferences'
  | 'PersonalInfo'
  | 'Language'
  | 'Country'
  | 'Appearance'
  | 'Help'
  | 'HowItWorks'
  | 'Terms'
  | 'Privacy'
  | 'About';

type CustomerShellValue = {
  isGuest: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  requestAuth: (mode?: AuthIntent) => void;
  openSettings: (screen: CustomerSettingsScreen) => void;
  goToReceive: (parcelId?: string) => void;
  goToSend: () => void;
  goToPoints: () => void;
  goToHome: () => void;
};

const CustomerShellContext = createContext<CustomerShellValue | null>(null);

export const CustomerShellProvider = CustomerShellContext.Provider;

export const DrawerOpenContext = createContext(false);

export function useDrawerOpen() {
  return useContext(DrawerOpenContext);
}

export function useCustomerShellOptional() {
  return useContext(CustomerShellContext);
}

export function useCustomerShell() {
  const value = useContext(CustomerShellContext);
  if (!value) {
    throw new Error('useCustomerShell must be used within CustomerShellProvider');
  }
  return value;
}
