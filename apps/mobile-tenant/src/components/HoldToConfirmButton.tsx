import { borders, type ColorTokens } from '@eveider/config-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '../theme';
import { AppSpinner } from './AppSpinner';

const HOLD_MS = 1100;

type HoldToConfirmButtonProps = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/** Press-and-hold primary action for claim / accept / start. */
export function HoldToConfirmButton({
  label,
  onConfirm,
  disabled = false,
  loading = false,
}: HoldToConfirmButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const isDisabled = disabled || loading;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function clearHold() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 120,
      useNativeDriver: false,
    }).start();
    setHolding(false);
  }

  function startHold() {
    if (isDisabled) return;
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      progress.setValue(0);
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  }

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      onPressIn={startHold}
      onPressOut={clearHold}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.disabled, holding && styles.holding]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Maintenir pour confirmer"
    >
      <Animated.View style={[styles.fill, { width }]} />
      <View style={styles.content}>
        {loading ? (
          <AppSpinner size="sm" color={colors.onPrimary} />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      height: 52,
      borderWidth: borders.width,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    holding: {
      borderColor: colors.secondary,
    },
    disabled: {
      opacity: 0.45,
    },
    fill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.secondary,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.onPrimary,
    },
  });
}
