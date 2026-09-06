import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createContext, memo, useContext, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { CourierHome } from '../screens/CourierHome';
import { CourierRouteScreen } from '../screens/CourierRouteScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen';
import { CountrySettingsScreen } from '../screens/settings/CountrySettingsScreen';
import { LanguageSettingsScreen } from '../screens/settings/LanguageSettingsScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { PlaceholderSettingsScreen } from '../screens/settings/PlaceholderSettingsScreen';
import { useColors } from '../theme';
import {
  CustomerShellProvider,
  DrawerOpenContext,
  useCustomerShell,
  type CustomerSettingsScreen,
} from './customer-shell';
import { getTabBarStyle } from './useHideTabBar';

export type CourierTabParamList = {
  Home: undefined;
  Route: undefined;
};

export type CourierStackParamList = {
  Tabs: NavigatorScreenParams<CourierTabParamList> | undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  PersonalInfo: undefined;
  Language: undefined;
  Country: undefined;
  Appearance: undefined;
  Help: undefined;
  Terms: undefined;
  Privacy: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator<CourierTabParamList>();
const Stack = createNativeStackNavigator<CourierStackParamList>();

function tabIcon(name: keyof typeof Feather.glyphMap): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, color, size }) => (
    <Feather name={name} size={size} color={color} strokeWidth={focused ? 2.25 : 2} />
  );
}

type CourierNavigatorProps = {
  onRequestAuth?: (mode?: 'login' | 'register') => void;
};

const StackNavRefContext = createContext<
  MutableRefObject<NativeStackNavigationProp<CourierStackParamList> | null>
>({ current: null });

export function CourierNavigator({ onRequestAuth }: CourierNavigatorProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stackNavRef = useRef<NativeStackNavigationProp<CourierStackParamList> | null>(null);
  const setDrawerOpenRef = useRef(setDrawerOpen);
  setDrawerOpenRef.current = setDrawerOpen;

  const shell = useMemo(
    () => ({
      isGuest: false,
      drawerOpen: false,
      openDrawer: () => setDrawerOpenRef.current(true),
      closeDrawer: () => setDrawerOpenRef.current(false),
      requestAuth: (mode?: 'login' | 'register') => onRequestAuth?.(mode),
      openSettings: (screen: CustomerSettingsScreen) => {
        setDrawerOpenRef.current(false);
        if (screen === 'HowItWorks') return;
        stackNavRef.current?.navigate(screen);
      },
      goToReceive: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Home' });
      },
      goToSend: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Home' });
      },
      goToPoints: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Route' });
      },
      goToHome: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Home' });
      },
    }),
    [onRequestAuth],
  );

  return (
    <CustomerShellProvider value={shell}>
      <DrawerOpenContext.Provider value={drawerOpen}>
        <StackNavRefContext.Provider value={stackNavRef}>
          <CourierStack />
        </StackNavRefContext.Provider>
      </DrawerOpenContext.Provider>
    </CustomerShellProvider>
  );
}

const CourierStack = memo(function CourierStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={CourierTabs} />
      <Stack.Screen name="Notifications" component={NotificationsRoute} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesRoute} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoRoute} />
      <Stack.Screen name="Language" component={LanguageRoute} />
      <Stack.Screen name="Country" component={CountryRoute} />
      <Stack.Screen name="Appearance" component={AppearanceRoute} />
      <Stack.Screen name="Help" component={HelpRoute} />
      <Stack.Screen name="Terms" component={TermsRoute} />
      <Stack.Screen name="Privacy" component={PrivacyRoute} />
      <Stack.Screen name="About" component={AboutRoute} />
    </Stack.Navigator>
  );
});

function CourierTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const stackNavRef = useContext(StackNavRefContext);
  stackNavRef.current = navigation;

  return (
    <View style={styles.fill}>
      <CourierTabBar />
      <DrawerHost />
    </View>
  );
}

function DrawerHost() {
  const drawerOpen = useContext(DrawerOpenContext);
  const { isGuest } = useCustomerShell();
  return <ProfileDrawer isGuest={isGuest} open={drawerOpen} mode="COURSIER" />;
}

const CourierTabBar = memo(function CourierTabBar() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
        name="Home"
        component={CourierHome}
        options={{ tabBarLabel: t('tabs.home'), tabBarIcon: tabIcon('home') }}
      />
      <Tab.Screen
        name="Route"
        component={CourierRouteScreen}
        options={{ tabBarLabel: t('tabs.route'), tabBarIcon: tabIcon('map') }}
      />
    </Tab.Navigator>
  );
});

function NotificationsRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  return (
    <NotificationsScreen
      mode="COURSIER"
      onBack={() => navigation.goBack()}
      onOpenParcel={() => navigation.navigate('Tabs', { screen: 'Home' })}
    />
  );
}

function NotificationPreferencesRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  return <NotificationPreferencesScreen mode="COURSIER" onBack={() => navigation.goBack()} />;
}

function LanguageRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  return <LanguageSettingsScreen mode="COURSIER" onBack={() => navigation.goBack()} />;
}

function CountryRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  return <CountrySettingsScreen mode="COURSIER" onBack={() => navigation.goBack()} />;
}

function AppearanceRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  return <AppearanceSettingsScreen mode="COURSIER" onBack={() => navigation.goBack()} />;
}

function PersonalInfoRoute() {
  return <PlaceholderRoute screen="PersonalInfo" />;
}

function HelpRoute() {
  return <PlaceholderRoute screen="Help" />;
}

function TermsRoute() {
  return <PlaceholderRoute screen="Terms" />;
}

function PrivacyRoute() {
  return <PlaceholderRoute screen="Privacy" />;
}

function AboutRoute() {
  return <PlaceholderRoute screen="About" />;
}

function PlaceholderRoute({
  screen,
}: {
  screen: 'PersonalInfo' | 'Help' | 'Terms' | 'Privacy' | 'About';
}) {
  const navigation = useNavigation<NativeStackNavigationProp<CourierStackParamList>>();
  const { t } = useTranslation();
  const copy = {
    PersonalInfo: {
      title: t('profile.personalInfo'),
      intro: t('placeholders.personalInfoIntro'),
      bullets: [t('placeholders.fullName'), t('placeholders.phone'), t('placeholders.email')],
    },
    Help: {
      title: t('profile.help'),
      intro: t('placeholders.helpIntro'),
      bullets: [t('placeholders.helpPickup'), t('placeholders.helpContact'), t('placeholders.helpReport')],
    },
    Terms: {
      title: t('profile.terms'),
      intro: t('placeholders.termsIntro'),
      bullets: undefined as string[] | undefined,
    },
    Privacy: {
      title: t('profile.privacy'),
      intro: t('placeholders.privacyIntro'),
      bullets: [t('placeholders.privacyData'), t('placeholders.privacyRetention'), t('placeholders.privacyRights')],
    },
    About: {
      title: t('profile.about'),
      intro: t('placeholders.aboutIntro'),
      bullets: [t('placeholders.aboutVersion'), t('placeholders.aboutCity'), t('placeholders.aboutCopyright')],
    },
  }[screen];

  return (
    <PlaceholderSettingsScreen
      mode="COURSIER"
      title={copy.title}
      onBack={() => navigation.goBack()}
      intro={copy.intro}
      bullets={copy.bullets}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
