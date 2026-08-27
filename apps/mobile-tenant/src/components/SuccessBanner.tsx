import { radius, type ColorTokens } from '@eveider/config-ui';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type SuccessBannerProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function SuccessBanner({ message, onDismiss, durationMs = 3000 }: SuccessBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    banner: {
      backgroundColor: colors.primary,
      borderRadius: radius.card,
      padding: 14,
      marginBottom: 16,
    },
    text: {
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.5,
      textAlign: 'center',
      color: colors.onPrimary,
    },
  });
}
