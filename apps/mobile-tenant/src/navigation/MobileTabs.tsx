import type { UserRole } from '@eveider/domain';
import { colors } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CourierHome } from '../screens/CourierHome';
import { CustomerHome } from '../screens/CustomerHome';
import { ProfileStack } from './ProfileStack';
import { DEFAULT_TAB_BAR_STYLE } from './useHideTabBar';

export type MobileTabParamList = {
  Colis: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MobileTabParamList>();

function tabIcon(name: keyof typeof Feather.glyphMap): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, color, size }) => (
    <Feather name={name} size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
  );
}

type MobileTabsProps = {
  role: UserRole;
  initialParcelId?: string;
};

export function MobileTabs({ role, initialParcelId }: MobileTabsProps) {
  const mode = role === 'courier' ? 'COURSIER' : 'CLIENT';
  const colisTitle = role === 'courier' ? 'LIVRAISONS' : 'MES COLIS';
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    ...DEFAULT_TAB_BAR_STYLE,
    height: 60 + insets.bottom,
    paddingBottom: Math.max(insets.bottom, 8),
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.6,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Colis"
        options={{
          tabBarLabel: 'COLIS',
          tabBarIcon: tabIcon('package'),
          title: colisTitle,
        }}
      >
        {() =>
          role === 'courier' ? (
            <CourierHome />
          ) : (
            <CustomerHome initialParcelId={initialParcelId} />
          )
        }
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          return {
            tabBarLabel: 'PARAMÈTRES',
            tabBarIcon: tabIcon('settings'),
            tabBarStyle: routeName === 'ProfileMain' ? tabBarStyle : { display: 'none' },
          };
        }}
      >
        {() => <ProfileStack mode={mode} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
