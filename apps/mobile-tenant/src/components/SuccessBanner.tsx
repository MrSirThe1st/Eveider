import { radius, type ColorTokens } from '@eveider/config-ui';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type SuccessBannerProps = {
  message: string;
  detail?: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function SuccessBanner({
  message,
  detail,
  onDismiss,
  durationMs = 4000,
}: SuccessBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, detail, durationMs, onDismiss]);

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
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
      fontSize: 14,
      textAlign: 'center',
      color: colors.onPrimary,
    },
    detail: {
      marginTop: 6,
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      color: colors.onPrimary,
    },
  });
}
