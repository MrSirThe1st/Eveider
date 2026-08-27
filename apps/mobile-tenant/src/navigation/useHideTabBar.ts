import { borders, type ColorTokens } from '@eveider/config-ui';
import { getFocusedRouteNameFromRoute, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect } from 'react';

export function getTabBarStyle(colors: ColorTokens) {
  return {
    backgroundColor: colors.surface,
    borderTopWidth: borders.width,
    borderTopColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    paddingTop: 6,
    display: 'flex' as const,
  };
}

/** @deprecated Use getTabBarStyle(colors) so the bar follows light/dark. */
export const DEFAULT_TAB_BAR_STYLE = getTabBarStyle(
  // Light fallback for any leftover static callers.
  {
    surface: '#FFFFFF',
    border: '#E5E7EB',
  } as ColorTokens,
);

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
