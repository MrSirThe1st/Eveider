import { colors, radius, borders } from '@eveider/config-ui';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSettings } from '../../context/settings-context';

type NotificationPreferencesScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function NotificationPreferencesScreen({ mode, onBack }: NotificationPreferencesScreenProps) {
  const {
    pushNotifications,
    emailNotifications,
    smsNotifications,
    setPushNotifications,
    setEmailNotifications,
    setSmsNotifications,
  } = useSettings();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader mode={mode} title="PRÉFÉRENCES" onBack={onBack} />
      <Text style={styles.subtitle}>
        Placeholders pour les canaux de notification. Les alertes colis restent disponibles dans
        l’écran Notifications.
      </Text>

      <View style={styles.group}>
        <ToggleRow
          label="Notifications push"
          description="Alertes instantanées sur l’appareil"
          value={pushNotifications}
          onValueChange={setPushNotifications}
        />
        <ToggleRow
          label="Notifications e-mail"
          description="Résumés et confirmations par e-mail"
          value={emailNotifications}
          onValueChange={setEmailNotifications}
        />
        <ToggleRow
          label="Notifications SMS"
          description="Messages texte pour les étapes clés"
          value={smsNotifications}
          onValueChange={setSmsNotifications}
        />
      </View>

      <Text style={styles.note}>Ces préférences sont enregistrées localement (MVP).</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  subtitle: {
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.75,
    lineHeight: 20,
  },
  group: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  rowDescription: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.7,
    lineHeight: 16,
  },
  note: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.secondary,
    opacity: 0.5,
  },
});
