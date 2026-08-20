import { nativeColors as colors, borders } from '@eveider/config-ui';
import { getFocusedRouteNameFromRoute, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect } from 'react';

export const DEFAULT_TAB_BAR_STYLE = {
  backgroundColor: colors.surface,
  borderTopWidth: borders.width,
  borderTopColor: colors.border,
  elevation: 8,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  paddingTop: 8,
  display: 'flex' as const,
};

const PROFILE_MAIN_ROUTE = 'ProfileMain';

/** Hide bottom tabs when a nested profile/settings screen is open. */
export function useHideTabBarOnNestedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const focusedRoute = getFocusedRouteNameFromRoute(route) ?? PROFILE_MAIN_ROUTE;
  const hidden = focusedRoute !== PROFILE_MAIN_ROUTE;

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    if (hidden) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      parent.setOptions({ tabBarStyle: undefined });
    }

    return () => {
      parent.setOptions({ tabBarStyle: undefined });
    };
  }, [hidden, navigation]);
}

/** @deprecated Use useHideTabBarOnNestedScreen inside ProfileStack screens. */
export function useHideTabBar(hidden: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    if (hidden) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      parent.setOptions({ tabBarStyle: undefined });
    }

    return () => {
      parent.setOptions({ tabBarStyle: undefined });
    };
  }, [hidden, navigation]);
}
