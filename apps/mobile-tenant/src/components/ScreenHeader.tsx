import { borders } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerShellOptional } from '../navigation/customer-shell';
import { useColors } from '../theme';

type ScreenHeaderProps = {
  mode?: 'CLIENT' | 'DRIVER';
  title?: string;
  onBack?: () => void;
  onMenu?: () => void;
  onLogout?: () => void;
  onNotifications?: () => void;
  unreadCount?: number;
};

export function ScreenHeader({
  title,
  onBack,
  onMenu,
  onLogout,
  onNotifications,
  unreadCount = 0,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const shell = useCustomerShellOptional();
  const handleMenu = onBack ? undefined : (onMenu ?? shell?.openDrawer);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Feather name="chevron-left" size={22} color={colors.secondary} />
          </Pressable>
        ) : handleMenu ? (
          <Pressable
            onPress={handleMenu}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('drawer.open')}
          >
            <Feather name="user" size={22} color={colors.secondary} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}

        <Text
          style={styles.title}
          pointerEvents="none"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title ?? ''}
        </Text>

        {onLogout ? (
          <Pressable onPress={onLogout} hitSlop={8} style={styles.iconButton}>
            <Text style={styles.logout}>{t('common.signOut')}</Text>
          </Pressable>
        ) : onNotifications ? (
          <Pressable
            onPress={onNotifications}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('profile.notifications')}
          >
            <Feather name="bell" size={20} color={colors.secondary} />
            {unreadCount > 0 ? <View style={styles.badge} /> : null}
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>
    </View>
  );
}

type ScreenScaffoldProps = {
  mode?: 'CLIENT' | 'DRIVER';
  title?: string;
  onBack?: () => void;
  onNotifications?: () => void;
  unreadCount?: number;
  children: ReactNode;
};

export function ScreenScaffold({
  mode,
  title,
  onBack,
  onNotifications,
  unreadCount,
  children,
}: ScreenScaffoldProps) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        mode={mode}
        title={title}
        onBack={onBack}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />
      {children}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.surface,
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
    },
    bar: {
      height: 48,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    title: {
      position: 'absolute',
      left: 52,
      right: 52,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    logout: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    badge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
  });
}
