import { colors, radius, borders } from '@eveider/config-ui';
import { StyleSheet, Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  message: {
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 13,
  },
});
