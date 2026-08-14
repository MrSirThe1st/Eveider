import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen';
import { LanguageSettingsScreen } from '../screens/settings/LanguageSettingsScreen';
import { NotificationPreferencesScreen } from '../screens/settings/NotificationPreferencesScreen';
import { PlaceholderSettingsScreen } from '../screens/settings/PlaceholderSettingsScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  PersonalInfo: undefined;
  Language: undefined;
  Appearance: undefined;
  Help: undefined;
  Terms: undefined;
  Privacy: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

type ProfileStackProps = {
  mode: 'CLIENT' | 'COURSIER';
};

export function ProfileStack({ mode }: ProfileStackProps) {
  const isCustomer = mode === 'CLIENT';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {({ navigation }) => (
          <ProfileScreen
            mode={mode}
            onOpenNotifications={
              isCustomer ? () => navigation.navigate('Notifications') : undefined
            }
            onOpenPersonalInfo={() => navigation.navigate('PersonalInfo')}
            onOpenNotificationPreferences={() => navigation.navigate('NotificationPreferences')}
            onOpenLanguage={() => navigation.navigate('Language')}
            onOpenAppearance={() => navigation.navigate('Appearance')}
            onOpenHelp={() => navigation.navigate('Help')}
            onOpenTerms={() => navigation.navigate('Terms')}
            onOpenPrivacy={() => navigation.navigate('Privacy')}
            onOpenAbout={() => navigation.navigate('About')}
          />
        )}
      </Stack.Screen>

      {isCustomer ? (
        <Stack.Screen name="Notifications">
          {({ navigation }) => (
            <NotificationsScreen mode={mode} onBack={() => navigation.goBack()} />
          )}
        </Stack.Screen>
      ) : null}

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
            intro="Centre d’aide Eveider pour clients et coursiers."
            bullets={['FAQ retrait colis', 'Contacter le support', 'Signaler un problème']}
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
        {({ navigation }) => (
          <PlaceholderSettingsScreen
            mode={mode}
            title="À PROPOS"
            onBack={() => navigation.goBack()}
            intro="Eveider — plateforme de casiers connectés en RDC."
            bullets={['Version MVP mobile', 'Kinshasa & environs', '© Eveider Technologies']}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
