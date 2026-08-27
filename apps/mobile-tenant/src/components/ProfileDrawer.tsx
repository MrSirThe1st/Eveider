import { Feather } from '@expo/vector-icons';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerShell } from '../navigation/customer-shell';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useColors } from '../theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.86, 360);
const OPEN_MS = 300;
const CLOSE_MS = 260;
const OPEN_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASE = Easing.bezier(0.4, 0, 1, 1);

type ProfileDrawerProps = {
  isGuest: boolean;
  open: boolean;
};

export function ProfileDrawer({ isGuest, open }: ProfileDrawerProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { closeDrawer } = useCustomerShell();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const dragStart = useRef(0);
  const openRef = useRef(open);
  const closeDrawerRef = useRef(closeDrawer);
  const ready = useRef(false);
  openRef.current = open;
  closeDrawerRef.current = closeDrawer;

  useLayoutEffect(() => {
    if (!ready.current) {
      ready.current = true;
      if (!open) return;
    }
    translateX.stopAnimation();
    Animated.timing(translateX, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: open ? OPEN_EASE : CLOSE_EASE,
      useNativeDriver: true,
    }).start();
  }, [open, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Boolean(openRef.current) &&
        gesture.dx < -10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
      onPanResponderGrant: () => {
        translateX.stopAnimation((value) => {
          dragStart.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.min(0, dragStart.current + gesture.dx));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -56 || gesture.vx < -0.45) {
          closeDrawerRef.current();
          return;
        }
        translateX.stopAnimation();
        Animated.timing(translateX, {
          toValue: 0,
          duration: OPEN_MS,
          easing: OPEN_EASE,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View
      style={styles.root}
      collapsable={false}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeDrawer}
        accessibilityRole="button"
        accessibilityLabel={t('drawer.close')}
      >
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: translateX.interpolate({
                inputRange: [-DRAWER_WIDTH, 0],
                outputRange: [0, 0.45],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </Pressable>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.panel,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.drawerBar}>
          <Pressable
            onPress={closeDrawer}
            hitSlop={8}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
          >
            <Feather name="x" size={22} color={colors.secondary} />
          </Pressable>
        </View>
        <DrawerBody isGuest={isGuest} />
      </Animated.View>
    </View>
  );
}

const DrawerBody = memo(function DrawerBody({ isGuest }: { isGuest: boolean }) {
  const {
    requestAuth,
    openSettings,
    goToReceive,
  } = useCustomerShell();

  return (
    <ProfileScreen
      mode="CLIENT"
      isGuest={isGuest}
      hideHeader
      onRequestAuth={() => requestAuth('login')}
      onOpenNotifications={() => openSettings('Notifications')}
      onOpenMyParcels={() => goToReceive()}
      onOpenPersonalInfo={() => openSettings('PersonalInfo')}
      onOpenNotificationPreferences={() => openSettings('NotificationPreferences')}
      onOpenLanguage={() => openSettings('Language')}
      onOpenCountry={() => openSettings('Country')}
      onOpenAppearance={() => openSettings('Appearance')}
      onOpenHelp={() => openSettings('Help')}
      onOpenHowItWorks={() => openSettings('HowItWorks')}
      onOpenTerms={() => openSettings('Terms')}
      onOpenPrivacy={() => openSettings('Privacy')}
      onOpenAbout={() => openSettings('About')}
    />
  );
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      zIndex: 30,
      elevation: 30,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000',
    },
    panel: {
      width: DRAWER_WIDTH,
      height: '100%',
      backgroundColor: colors.background,
    },
    drawerBar: {
      paddingHorizontal: 8,
      height: 44,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
