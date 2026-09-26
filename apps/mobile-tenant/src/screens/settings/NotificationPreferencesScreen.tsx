import { type ColorTokens } from '@eveider/config-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { useSettings } from '../../context/settings-context';
import {
  fetchPushNotificationPreference,
  setPushNotificationPreference,
} from '../../lib/api';
import {
  syncPushRegistration,
  getNotificationOsGranted,
  isRemotePushSupported,
} from '../../lib/push-notifications';
import { useColors } from '../../theme';

type NotificationPreferencesScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  onBack: () => void;
};

export function NotificationPreferencesScreen({ onBack }: NotificationPreferencesScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const { pushNotifications, setPushNotifications } = useSettings();
  const [osGranted, setOsGranted] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const remotePushSupported = isRemotePushSupported();

  const refreshOsPermission = useCallback(async () => {
    setOsGranted(await getNotificationOsGranted());
  }, []);

  useEffect(() => {
    void refreshOsPermission();
    void (async () => {
      const result = await fetchPushNotificationPreference();
      if (result.success) {
        setPushNotifications(result.data.pushNotificationsEnabled);
      }
    })();
  }, [refreshOsPermission, setPushNotifications]);

  async function handleToggle(next: boolean) {
    setPushNotifications(next);
    setSaving(true);
    const result = await setPushNotificationPreference(next);
    setSaving(false);
    if (!result.success) {
      setPushNotifications(!next);
      return;
    }
    if (next && remotePushSupported) {
      await syncPushRegistration();
      await refreshOsPermission();
    }
  }

  return (
    <ScreenScaffold title={t('notificationPrefs.title')} onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t('notificationPrefs.subtitle')}</Text>

        {remotePushSupported && osGranted === false ? (
          <View style={styles.osBanner}>
            <Text style={styles.osBannerTitle}>{t('notificationPrefs.osDisabledTitle')}</Text>
            <Text style={styles.osBannerBody}>{t('notificationPrefs.osDisabledBody')}</Text>
            <Pressable
              onPress={() => void Linking.openSettings()}
              style={styles.osBannerButton}
              accessibilityRole="button"
            >
              <Text style={styles.osBannerButtonText}>{t('notificationPrefs.openSettings')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t('notificationPrefs.push')}</Text>
            <Text style={styles.rowDescription}>{t('notificationPrefs.pushDescription')}</Text>
          </View>
          <Switch
            value={pushNotifications}
            onValueChange={(next) => void handleToggle(next)}
            disabled={saving}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text style={styles.note}>{t('notificationPrefs.inboxNote')}</Text>
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
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    subtitle: {
      marginBottom: 12,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
    osBanner: {
      marginBottom: 16,
      paddingVertical: 12,
      gap: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    osBannerTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    osBannerBody: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 19,
    },
    osBannerButton: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingVertical: 8,
    },
    osBannerButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    rowDescription: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 17,
    },
    note: {
      marginTop: 24,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      opacity: 0.85,
    },
  });
}
