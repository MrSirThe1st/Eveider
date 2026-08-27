import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColors } from '../theme';

type AppSpinnerSize = 'sm' | 'md' | 'lg';

type AppSpinnerProps = {
  size?: AppSpinnerSize;
  color?: string;
  /** Fill the parent and center. Defaults to true except for `sm` (buttons). */
  fill?: boolean;
};

const SIZE: Record<AppSpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'large',
  lg: 'large',
};

export function AppSpinner({ size = 'md', color, fill }: AppSpinnerProps) {
  const colors = useColors();
  const centered = fill ?? size !== 'sm';

  const indicator = (
    <ActivityIndicator
      accessibilityRole="progressbar"
      size={SIZE[size]}
      color={color ?? colors.primary}
    />
  );

  if (!centered) return indicator;

  return <View style={styles.fill}>{indicator}</View>;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    paddingVertical: 24,
  },
});
