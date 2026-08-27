import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createContext, memo, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileDrawer } from '../components/ProfileDrawer';
import type { CustomerParcel } from '../lib/api';
import { CustomerHome } from '../screens/CustomerHome';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PointsScreen } from '../screens/PointsScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { SendScreen } from '../screens/SendScreen';
import { TrackResultScreen } from '../screens/TrackResultScreen';
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

export type CustomerTabParamList = {
  Home: undefined;
  Send: undefined;
  Receive: { parcelId?: string; focusNonce?: number } | undefined;
  Points: undefined;
};

export type CustomerStackParamList = {
  Tabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  TrackResult: { parcel: CustomerParcel };
  Notifications: undefined;
  NotificationPreferences: undefined;
  PersonalInfo: undefined;
  Language: undefined;
  Country: undefined;
  Appearance: undefined;
  Help: undefined;
  HowItWorks: undefined;
  Terms: undefined;
  Privacy: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

function tabIcon(name: keyof typeof Feather.glyphMap): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, color, size }) => (
    <Feather name={name} size={size} color={color} strokeWidth={focused ? 2.25 : 2} />
  );
}

type CustomerNavigatorProps = {
  initialParcelId?: string;
  isGuest?: boolean;
  onRequestAuth?: (mode?: 'login' | 'register') => void;
};

const ParcelFocusContext = createContext<{ parcelId?: string; nonce: number }>({ nonce: 0 });
const StackNavRefContext = createContext<
  MutableRefObject<NativeStackNavigationProp<CustomerStackParamList> | null>
>({ current: null });
const FocusParcelRefContext = createContext<MutableRefObject<(parcelId: string) => void>>({
  current: () => {},
});

export function CustomerNavigator({
  initialParcelId,
  isGuest = false,
  onRequestAuth,
}: CustomerNavigatorProps) {
  const [focusedParcelId, setFocusedParcelId] = useState(initialParcelId);
  const [parcelFocusNonce, setParcelFocusNonce] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stackNavRef = useRef<NativeStackNavigationProp<CustomerStackParamList> | null>(null);
  const setDrawerOpenRef = useRef(setDrawerOpen);
  const focusParcelRef = useRef<(parcelId: string) => void>(() => {});
  setDrawerOpenRef.current = setDrawerOpen;
  focusParcelRef.current = (parcelId: string) => {
    setFocusedParcelId(parcelId);
    setParcelFocusNonce((value) => value + 1);
  };

  const shell = useMemo(
    () => ({
      isGuest,
      drawerOpen: false,
      openDrawer: () => setDrawerOpenRef.current(true),
      closeDrawer: () => setDrawerOpenRef.current(false),
      requestAuth: (mode?: 'login' | 'register') => onRequestAuth?.(mode),
      openSettings: (screen: CustomerSettingsScreen) => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate(screen);
      },
      goToReceive: (parcelId?: string) => {
        setDrawerOpenRef.current(false);
        if (parcelId) {
          setFocusedParcelId(parcelId);
          setParcelFocusNonce((value) => value + 1);
        }
        stackNavRef.current?.navigate('Tabs', {
          screen: 'Receive',
          params: parcelId ? { parcelId, focusNonce: Date.now() } : undefined,
        });
      },
      goToSend: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Send' });
      },
      goToPoints: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Points' });
      },
      goToHome: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Tabs', { screen: 'Home' });
      },
    }),
    [isGuest, onRequestAuth],
  );

  const parcelFocus = useMemo(
    () => ({ parcelId: focusedParcelId, nonce: parcelFocusNonce }),
    [focusedParcelId, parcelFocusNonce],
  );

  return (
    <CustomerShellProvider value={shell}>
      <DrawerOpenContext.Provider value={drawerOpen}>
        <StackNavRefContext.Provider value={stackNavRef}>
          <FocusParcelRefContext.Provider value={focusParcelRef}>
            <ParcelFocusContext.Provider value={parcelFocus}>
              <CustomerStack />
            </ParcelFocusContext.Provider>
          </FocusParcelRefContext.Provider>
        </StackNavRefContext.Provider>
      </DrawerOpenContext.Provider>
    </CustomerShellProvider>
  );
}

const CustomerStack = memo(function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={CustomerTabs} />
      <Stack.Screen name="TrackResult" component={TrackResultRoute} />
      <Stack.Screen name="Notifications" component={NotificationsRoute} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesRoute} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoRoute} />
      <Stack.Screen name="Language" component={LanguageRoute} />
      <Stack.Screen name="Country" component={CountryRoute} />
      <Stack.Screen name="Appearance" component={AppearanceRoute} />
      <Stack.Screen name="Help" component={HelpRoute} />
      <Stack.Screen name="HowItWorks" component={HowItWorksRoute} />
      <Stack.Screen name="Terms" component={TermsRoute} />
      <Stack.Screen name="Privacy" component={PrivacyRoute} />
      <Stack.Screen name="About" component={AboutRoute} />
    </Stack.Navigator>
  );
});

function CustomerTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const stackNavRef = useContext(StackNavRefContext);
  stackNavRef.current = navigation;

  return (
    <View style={styles.fill}>
      <CustomerTabBar />
      <DrawerHost />
    </View>
  );
}

function DrawerHost() {
  const drawerOpen = useContext(DrawerOpenContext);
  const { isGuest } = useCustomerShell();
  return <ProfileDrawer isGuest={isGuest} open={drawerOpen} />;
}

const CustomerTabBar = memo(function CustomerTabBar() {
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
          component={CustomerHomeScreen}
          options={{ tabBarLabel: t('tabs.home'), tabBarIcon: tabIcon('home') }}
        />
        <Tab.Screen
          name="Send"
          component={SendScreen}
          options={{ tabBarLabel: t('tabs.send'), tabBarIcon: tabIcon('send') }}
        />
        <Tab.Screen
          name="Receive"
          component={ReceiveTab}
          options={{ tabBarLabel: t('tabs.receive'), tabBarIcon: tabIcon('package') }}
        />
        <Tab.Screen
          name="Points"
          component={PointsScreen}
          options={{ tabBarLabel: t('tabs.points'), tabBarIcon: tabIcon('map-pin') }}
        />
      </Tab.Navigator>
  );
});

function CustomerHomeScreen() {
  const stackNavRef = useContext(StackNavRefContext);
  const onTrackResult = useCallback(
    (parcel: CustomerParcel) => {
      stackNavRef.current?.navigate('TrackResult', { parcel });
    },
    [stackNavRef],
  );
  return <CustomerHome onTrackResult={onTrackResult} />;
}

function ReceiveTab() {
  const { parcelId, nonce } = useContext(ParcelFocusContext);
  const { isGuest, requestAuth } = useCustomerShell();
  const stackNavRef = useContext(StackNavRefContext);
  return (
    <ReceiveScreen
      initialParcelId={parcelId}
      focusNonce={nonce}
      isGuest={isGuest}
      onRequestAuth={() => requestAuth('login')}
      onOpenNotifications={() => stackNavRef.current?.navigate('Notifications')}
    />
  );
}

function TrackResultRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const route = useRoute<RouteProp<CustomerStackParamList, 'TrackResult'>>();
  return <TrackResultScreen parcel={route.params.parcel} onBack={() => navigation.goBack()} />;
}

function NotificationsRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const focusParcelRef = useContext(FocusParcelRefContext);
  return (
    <NotificationsScreen
      mode="CLIENT"
      onBack={() => navigation.goBack()}
      onOpenParcel={(parcelId) => {
        focusParcelRef.current(parcelId);
        navigation.navigate('Tabs', {
          screen: 'Receive',
          params: { parcelId, focusNonce: Date.now() },
        });
      }}
    />
  );
}

function NotificationPreferencesRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return <NotificationPreferencesScreen mode="CLIENT" onBack={() => navigation.goBack()} />;
}

function LanguageRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return <LanguageSettingsScreen mode="CLIENT" onBack={() => navigation.goBack()} />;
}

function CountryRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return <CountrySettingsScreen mode="CLIENT" onBack={() => navigation.goBack()} />;
}

function AppearanceRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return <AppearanceSettingsScreen mode="CLIENT" onBack={() => navigation.goBack()} />;
}

function PersonalInfoRoute() {
  return <PlaceholderRoute screen="PersonalInfo" />;
}

function HelpRoute() {
  return <PlaceholderRoute screen="Help" />;
}

function HowItWorksRoute() {
  return <PlaceholderRoute screen="HowItWorks" />;
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
  screen: 'PersonalInfo' | 'Help' | 'HowItWorks' | 'Terms' | 'Privacy' | 'About';
}) {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return <SettingsPlaceholder screen={screen} onBack={() => navigation.goBack()} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

function SettingsPlaceholder({
  screen,
  onBack,
}: {
  screen: 'PersonalInfo' | 'Help' | 'HowItWorks' | 'Terms' | 'Privacy' | 'About';
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const copy = {
    PersonalInfo: {
      title: t('profile.personalInfo'),
      intro: t('placeholders.personalInfoIntro'),
      bullets: [t('placeholders.fullName'), t('placeholders.phone'), t('placeholders.email')],
      hideFooter: false,
    },
    Help: {
      title: t('profile.help'),
      intro: t('placeholders.helpIntro'),
      bullets: [t('placeholders.helpPickup'), t('placeholders.helpContact'), t('placeholders.helpReport')],
      hideFooter: false,
    },
    HowItWorks: {
      title: t('howItWorks.title'),
      intro: t('howItWorks.intro'),
      bullets: [
        t('howItWorks.bullet1'),
        t('howItWorks.bullet2'),
        t('howItWorks.bullet3'),
        t('howItWorks.bullet4'),
      ],
      hideFooter: true,
    },
    Terms: {
      title: t('profile.terms'),
      intro: t('placeholders.termsIntro'),
      bullets: undefined,
      hideFooter: false,
    },
    Privacy: {
      title: t('profile.privacy'),
      intro: t('placeholders.privacyIntro'),
      bullets: [t('placeholders.privacyData'), t('placeholders.privacyRetention'), t('placeholders.privacyRights')],
      hideFooter: false,
    },
    About: {
      title: t('profile.about'),
      intro: t('placeholders.aboutIntro'),
      bullets: [t('placeholders.aboutVersion'), t('placeholders.aboutCity'), t('placeholders.aboutCopyright')],
      hideFooter: false,
    },
  }[screen];

  return (
    <PlaceholderSettingsScreen
      mode="CLIENT"
      title={copy.title}
      onBack={onBack}
      intro={copy.intro}
      bullets={copy.bullets}
      hideFooter={copy.hideFooter}
    />
  );
}
