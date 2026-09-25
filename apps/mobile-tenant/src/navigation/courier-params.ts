import type { NavigatorScreenParams } from '@react-navigation/native';

export type CourierTabParamList = {
  Home: undefined;
  History: undefined;
};

export type CourierStackParamList = {
  Tabs: NavigatorScreenParams<CourierTabParamList> | undefined;
  Route: { deliveryId?: string } | undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  PersonalInfo: undefined;
  EditPersonalInfo: undefined;
  ChangePassword: undefined;
  DriverProfile: undefined;
  Language: undefined;
  Country: undefined;
  Appearance: undefined;
  Help: undefined;
  HowItWorks: undefined;
  Terms: undefined;
  Privacy: undefined;
  About: undefined;
};
