import { colors, radius, borders } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ProfileMenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function ProfileMenuItem({
  icon,
  label,
  subtitle,
  onPress,
  disabled,
  destructive,
}: ProfileMenuItemProps) {
  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={[styles.iconWrap, destructive && styles.iconDestructive]}>
        <Feather
          name={icon}
          size={18}
          color={destructive ? colors.danger : colors.secondary}
          strokeWidth={2}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {!disabled ? (
        <Feather name="chevron-right" size={18} color={colors.border} />
      ) : (
        <Text style={styles.badge}>BIENTÔT</Text>
      )}
    </View>
  );

  if (disabled || !onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: radius.card,
    marginBottom: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  disabled: {
    opacity: 0.65,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDestructive: {
    backgroundColor: '#FDECEA',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.secondary,
  },
  labelDestructive: {
    color: colors.danger,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.7,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.secondary,
    opacity: 0.5,
  },
});
