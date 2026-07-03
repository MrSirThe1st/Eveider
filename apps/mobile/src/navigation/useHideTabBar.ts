import { colors } from '@eveider/config-ui';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

export const DEFAULT_TAB_BAR_STYLE = {
  backgroundColor: colors.background,
  borderTopWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
  height: 64,
  paddingBottom: 8,
  paddingTop: 8,
  display: 'flex' as const,
};

export function useHideTabBar(hidden: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    if (hidden) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    }

    return () => {
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    };
  }, [hidden, navigation]);
}
