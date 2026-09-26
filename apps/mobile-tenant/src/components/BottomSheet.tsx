import { borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  hint?: string;
  children: ReactNode;
};

/** Shared driver bottom drawer — handle, rounded top, soft scrim. */
export function BottomSheet({ open, onClose, title, hint, children }: BottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

type BottomSheetOptionProps = {
  label: string;
  detail?: string;
  active?: boolean;
  onPress: () => void;
  last?: boolean;
};

/** Quiet selectable row for sheet option lists. */
export function BottomSheetOption({
  label,
  detail,
  active = false,
  onPress,
  last = false,
}: BottomSheetOptionProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, !last && styles.optionBorder]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
        {detail ? <Text style={styles.optionDetail}>{detail}</Text> : null}
      </View>
      {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 20, 0.42)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 8,
      maxHeight: '88%',
    },
    handleWrap: {
      alignItems: 'center',
      paddingBottom: 12,
      paddingTop: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 4,
    },
    hint: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: 12,
    },
    body: {
      gap: 10,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 2,
    },
    optionBorder: {
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
    },
    optionText: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.secondary,
    },
    optionLabelActive: {
      color: colors.primary,
    },
    optionDetail: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
