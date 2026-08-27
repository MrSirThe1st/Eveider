import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type ProfileMenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  showChevron?: boolean;
  last?: boolean;
};

export function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

export function ProfileMenuItem({
  icon,
  label,
  subtitle,
  value,
  onPress,
  disabled,
  destructive,
  showChevron = true,
  last = false,
}: ProfileMenuItemProps) {
  const colors = useColors();
  const styles = useMemo(() => createItemStyles(colors), [colors]);
  const content = (
    <View style={[styles.row, disabled && styles.disabled, !last && styles.rowBorder]}>
      <Feather
        name={icon}
        size={18}
        color={destructive ? colors.danger : colors.secondary}
        strokeWidth={2}
      />
      <View style={styles.textWrap}>
        <Text
          style={[styles.label, destructive && styles.labelDestructive]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      ) : null}
      {showChevron && !disabled && onPress ? (
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (disabled || !onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function createSectionStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 8,
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
      marginTop: 16,
    },
  });
}

function createItemStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
      backgroundColor: 'transparent',
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    disabled: {
      opacity: 0.55,
    },
    textWrap: {
      flexShrink: 0,
    },
    label: {
      fontWeight: '500',
      fontSize: 16,
      color: colors.secondary,
    },
    labelDestructive: {
      color: colors.danger,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
    },
    value: {
      flex: 1,
      flexShrink: 1,
      minWidth: 48,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'right',
    },
  });
}
