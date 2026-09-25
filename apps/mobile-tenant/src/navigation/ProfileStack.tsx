import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen';
import { CountrySettingsScreen } from '../screens/settings/CountrySettingsScreen';
import { LanguageSettingsScreen } from '../screens/settings/LanguageSettingsScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { AboutSettingsScreen } from '../screens/settings/AboutSettingsScreen';
import { PlaceholderSettingsScreen } from '../screens/settings/PlaceholderSettingsScreen';
import { openDispatcherWhatsApp } from '../lib/support';

export type ProfileStackParamList = {
  ProfileMain: undefined;
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

const Stack = createNativeStackNavigator<ProfileStackParamList>();

type ProfileStackProps = {
  mode: 'CLIENT' | 'DRIVER';
  isGuest?: boolean;
  onRequestAuth?: () => void;
  onOpenParcel?: (parcelId: string) => void;
};

export function ProfileStack({ mode, isGuest = false, onRequestAuth, onOpenParcel }: ProfileStackProps) {
  const isCustomer = mode === 'CLIENT';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {({ navigation }) => (
          <ProfileScreen
            mode={mode}
            isGuest={isGuest}
            onRequestAuth={onRequestAuth}
            onOpenNotifications={() => navigation.navigate('Notifications')}
            onOpenPersonalInfo={() => navigation.navigate('PersonalInfo')}
            onOpenLanguage={() => navigation.navigate('Language')}
            onOpenAppearance={() => navigation.navigate('Appearance')}
            onOpenHelp={() => navigation.navigate('Help')}
            onOpenTerms={() => navigation.navigate('Terms')}
            onOpenPrivacy={() => navigation.navigate('Privacy')}
            onOpenAbout={() => navigation.navigate('About')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Notifications">
        {({ navigation }) => (
          <NotificationsScreen
            mode={mode}
            onBack={() => navigation.goBack()}
            onOpenPreferences={() => navigation.navigate('NotificationPreferences')}
            onOpenParcel={(parcelId) => {
              onOpenParcel?.(parcelId);
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="NotificationPreferences">
        {({ navigation }) => (
          <NotificationPreferencesScreen mode={mode} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="PersonalInfo">
        {({ navigation }) => (
          <PlaceholderSettingsScreen
            mode={mode}
            title="INFORMATIONS"
            onBack={() => navigation.goBack()}
            intro="Modifiez votre nom, téléphone et coordonnées de contact."
            bullets={['Nom complet', 'Numéro de téléphone', 'Adresse e-mail']}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Language">
        {({ navigation }) => (
          <LanguageSettingsScreen mode={mode} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Country">
        {({ navigation }) => (
          <CountrySettingsScreen mode={mode} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Appearance">
        {({ navigation }) => (
          <AppearanceSettingsScreen mode={mode} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Help">
        {({ navigation }) => (
          <PlaceholderSettingsScreen
            mode={mode}
            title="AIDE & SUPPORT"
            onBack={() => navigation.goBack()}
            intro={
              isCustomer
                ? 'Centre d’aide Eveider pour destinataires et chauffeurs.'
                : 'Incidents dans l’app pour changer le statut d’une livraison. WhatsApp pour parler au dispatch.'
            }
            bullets={
              isCustomer
                ? ['FAQ retrait colis', 'Contacter le support', 'Signaler un problème']
                : [
                    'Signaler un incident depuis la livraison',
                    'Contacter le dispatch sur WhatsApp',
                    'Le chat ne change pas le statut d’une livraison',
                  ]
            }
            action={
              isCustomer
                ? undefined
                : { label: 'WHATSAPP DISPATCH', onPress: () => openDispatcherWhatsApp() }
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Terms">
        {({ navigation }) => (
          <PlaceholderSettingsScreen
            mode={mode}
            title="CONDITIONS"
            onBack={() => navigation.goBack()}
            intro="Conditions générales d’utilisation de l’application Eveider."
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Privacy">
        {({ navigation }) => (
          <PlaceholderSettingsScreen
            mode={mode}
            title="CONFIDENTIALITÉ"
            onBack={() => navigation.goBack()}
            intro="Politique de confidentialité et traitement des données personnelles."
            bullets={['Données collectées', 'Conservation', 'Vos droits']}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="About">
        {({ navigation }) => <AboutSettingsScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
