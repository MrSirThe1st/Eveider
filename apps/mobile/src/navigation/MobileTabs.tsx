import type { UserRole } from '@eveider/domain';
import { colors } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { CourierHome } from '../screens/CourierHome';
import { CustomerHome } from '../screens/CustomerHome';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DEFAULT_TAB_BAR_STYLE } from './useHideTabBar';

export type MobileTabParamList = {
  Colis: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MobileTabParamList>();

function tabIcon(name: keyof typeof Feather.glyphMap): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, color, size }) => (
    <Feather name={name} size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
  );
}

type MobileTabsProps = {
  role: UserRole;
  initialParcelId?: string;
};

export function MobileTabs({ role, initialParcelId }: MobileTabsProps) {
  const mode = role === 'courier' ? 'COURSIER' : 'CLIENT';
  const colisTitle = role === 'courier' ? 'LIVRAISONS' : 'MES COLIS';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: DEFAULT_TAB_BAR_STYLE,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.6,
        },
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
        options={{
          tabBarLabel: 'PROFIL',
          tabBarIcon: tabIcon('user'),
        }}
      >
        {() => <ProfileScreen mode={mode} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
