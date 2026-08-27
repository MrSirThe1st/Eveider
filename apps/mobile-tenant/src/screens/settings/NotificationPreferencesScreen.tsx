import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { useSettings } from '../../context/settings-context';
import { useColors } from '../../theme';

type NotificationPreferencesScreenProps = {
  mode: 'CLIENT' | 'COURSIER';
  onBack: () => void;
};

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  colors: ColorTokens;
  styles: ReturnType<typeof createStyles>;
};

function ToggleRow({ label, description, value, onValueChange, colors, styles }: ToggleRowProps) {
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

export function NotificationPreferencesScreen({ onBack }: NotificationPreferencesScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const {
    pushNotifications,
    emailNotifications,
    smsNotifications,
    setPushNotifications,
    setEmailNotifications,
    setSmsNotifications,
  } = useSettings();

  return (
    <ScreenScaffold title={t('notificationPrefs.title')} onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t('notificationPrefs.subtitle')}</Text>

        <View style={styles.group}>
          <ToggleRow
            label={t('notificationPrefs.push')}
            description={t('notificationPrefs.pushDescription')}
            value={pushNotifications}
            onValueChange={setPushNotifications}
            colors={colors}
            styles={styles}
          />
          <ToggleRow
            label={t('notificationPrefs.email')}
            description={t('notificationPrefs.emailDescription')}
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            colors={colors}
            styles={styles}
          />
          <ToggleRow
            label={t('notificationPrefs.sms')}
            description={t('notificationPrefs.smsDescription')}
            value={smsNotifications}
            onValueChange={setSmsNotifications}
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.note}>{t('notificationPrefs.note')}</Text>
      </ScrollView>
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
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
      borderWidth: borders.width,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      padding: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
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
}
