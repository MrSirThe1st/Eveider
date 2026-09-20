import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createContext, memo, useContext, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { RECIPIENT_PRIMARY_TAB } from '../lib/recipient-nav';
import type { CustomerParcel } from '../lib/api';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { TrackResultScreen } from '../screens/TrackResultScreen';
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen';
import { CountrySettingsScreen } from '../screens/settings/CountrySettingsScreen';
import { LanguageSettingsScreen } from '../screens/settings/LanguageSettingsScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { PlaceholderSettingsScreen } from '../screens/settings/PlaceholderSettingsScreen';
import {
  CustomerShellProvider,
  DrawerOpenContext,
  useCustomerShell,
  type CustomerSettingsScreen,
} from './customer-shell';

export type CustomerStackParamList = {
  Home: { parcelId?: string; focusNonce?: number } | undefined;
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

const Stack = createNativeStackNavigator<CustomerStackParamList>();

type CustomerNavigatorProps = {
  initialParcelId?: string;
  isGuest?: boolean;
  onRequestAuth?: (mode?: 'login' | 'register') => void;
};

const StackNavRefContext = createContext<
  MutableRefObject<NativeStackNavigationProp<CustomerStackParamList> | null>
>({ current: null });

export function CustomerNavigator({
  initialParcelId,
  isGuest = false,
  onRequestAuth,
}: CustomerNavigatorProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stackNavRef = useRef<NativeStackNavigationProp<CustomerStackParamList> | null>(null);
  const setDrawerOpenRef = useRef(setDrawerOpen);
  setDrawerOpenRef.current = setDrawerOpen;

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
        stackNavRef.current?.navigate(
          'Home',
          parcelId ? { parcelId, focusNonce: Date.now() } : undefined,
        );
      },
      goToHome: () => {
        setDrawerOpenRef.current(false);
        stackNavRef.current?.navigate('Home');
      },
    }),
    [isGuest, onRequestAuth],
  );

  return (
    <CustomerShellProvider value={shell}>
      <DrawerOpenContext.Provider value={drawerOpen}>
        <StackNavRefContext.Provider value={stackNavRef}>
          <CustomerStack initialParcelId={initialParcelId} />
        </StackNavRefContext.Provider>
      </DrawerOpenContext.Provider>
    </CustomerShellProvider>
  );
}

const CustomerStack = memo(function CustomerStack({
  initialParcelId,
}: {
  initialParcelId?: string;
}) {
  return (
    <View style={styles.fill}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Home"
      >
        <Stack.Screen name="Home" component={HomeRoute} initialParams={{ parcelId: initialParcelId }} />
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
      <DrawerHost />
    </View>
  );
});

function DrawerHost() {
  const drawerOpen = useContext(DrawerOpenContext);
  const { isGuest } = useCustomerShell();
  return <ProfileDrawer isGuest={isGuest} open={drawerOpen} />;
}

function HomeRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const route = useRoute<RouteProp<CustomerStackParamList, 'Home'>>();
  const stackNavRef = useContext(StackNavRefContext);
  stackNavRef.current = navigation;
  const { isGuest, requestAuth } = useCustomerShell();

  return (
    <ReceiveScreen
      titleKey={RECIPIENT_PRIMARY_TAB.i18nKey}
      initialParcelId={route.params?.parcelId}
      focusNonce={route.params?.focusNonce ?? 0}
      isGuest={isGuest}
      onRequestAuth={() => requestAuth('login')}
      onOpenNotifications={() => navigation.navigate('Notifications')}
      onTrackResult={(parcel) => navigation.navigate('TrackResult', { parcel })}
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
  return (
    <NotificationsScreen
      mode="CLIENT"
      onBack={() => navigation.goBack()}
      onOpenParcel={(parcelId) => {
        navigation.navigate('Home', { parcelId, focusNonce: Date.now() });
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

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
