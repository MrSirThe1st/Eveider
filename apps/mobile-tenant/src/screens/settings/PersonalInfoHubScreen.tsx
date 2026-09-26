import { type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProfileMenuItem, ProfileSection } from '../../components/ProfileMenuItem';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { useColors } from '../../theme';

type PersonalInfoHubScreenProps = {
  mode: 'CLIENT' | 'DRIVER';
  onBack: () => void;
  onOpenEditProfile: () => void;
  onOpenChangePassword: () => void;
};

export function PersonalInfoHubScreen({
  onBack,
  onOpenEditProfile,
  onOpenChangePassword,
}: PersonalInfoHubScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();

  return (
    <ScreenScaffold title={t('profile.personalInfo')} onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('personalInfoSettings.hubIntro')}</Text>

        <ProfileSection title={t('profile.account')}>
          <ProfileMenuItem
            icon="user"
            label={t('profile.editProfile')}
            subtitle={t('profile.editProfileSubtitle')}
            onPress={onOpenEditProfile}
          />
          <ProfileMenuItem
            icon="lock"
            label={t('profile.password')}
            subtitle={t('profile.passwordSubtitle')}
            onPress={onOpenChangePassword}
            last
          />
        </ProfileSection>
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
    intro: {
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
  });
}
