import type { UserRole } from '@eveider/domain';
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CourierHome } from '../screens/CourierHome';
import { useColors } from '../theme';
import { CustomerNavigator } from './CustomerNavigator';
import { ProfileStack, type ProfileStackParamList } from './ProfileStack';
import { getTabBarStyle } from './useHideTabBar';

export type MobileTabParamList = {
  Colis: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<MobileTabParamList>();

function tabIcon(name: keyof typeof Feather.glyphMap): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, color, size }) => (
    <Feather name={name} size={size} color={color} strokeWidth={focused ? 2.25 : 2} />
  );
}

type MobileTabsProps = {
  role: UserRole;
  initialParcelId?: string;
  isGuest?: boolean;
  onRequestAuth?: (mode?: 'login' | 'register') => void;
};

export function MobileTabs({ role, initialParcelId, isGuest = false, onRequestAuth }: MobileTabsProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const mode = role === 'courier' ? 'COURSIER' : 'CLIENT';
  const insets = useSafeAreaInsets();
  const [focusedParcelId, setFocusedParcelId] = useState(initialParcelId);

  if (role !== 'courier') {
    return (
      <CustomerNavigator
        initialParcelId={initialParcelId}
        isGuest={isGuest}
        onRequestAuth={onRequestAuth}
      />
    );
  }

  const tabBarStyle = {
    ...getTabBarStyle(colors),
    height: 60 + insets.bottom,
    paddingBottom: Math.max(insets.bottom, 8),
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Colis"
        options={{
          tabBarLabel: t('tabs.parcels'),
          tabBarIcon: tabIcon('package'),
          title: t('home.title'),
        }}
      >
        {() => <CourierHome />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          return {
            tabBarLabel: t('tabs.settings'),
            tabBarIcon: tabIcon('settings'),
            tabBarStyle: routeName === 'ProfileMain' ? tabBarStyle : { display: 'none' },
          };
        }}
      >
        {({ navigation }) => (
          <ProfileStack
            mode={mode}
            isGuest={isGuest}
            onRequestAuth={onRequestAuth}
            onOpenParcel={(parcelId) => {
              setFocusedParcelId(parcelId);
              navigation.navigate('Colis');
            }}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
