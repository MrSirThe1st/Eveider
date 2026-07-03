import { colors, radius } from '@eveider/config-ui';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SuccessBannerProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function SuccessBanner({ message, onDismiss, durationMs = 3000 }: SuccessBannerProps) {
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

const styles = StyleSheet.create({
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
    color: colors.secondary,
  },
});
