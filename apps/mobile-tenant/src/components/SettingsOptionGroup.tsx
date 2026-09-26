import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';
import { ScreenScaffold } from './ScreenHeader';

type SettingsOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type SettingsOptionGroupProps<T extends string> = {
  mode: 'CLIENT' | 'DRIVER';
  title: string;
  subtitle?: string;
  options: SettingsOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onBack: () => void;
  placeholderNote?: string;
};

/** Nested settings choice list — same flat language as the profile drawer. */
export function SettingsOptionGroup<T extends string>({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onBack,
  placeholderNote,
}: SettingsOptionGroupProps<T>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenScaffold title={title} onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.group}>
          {options.map((option, index) => {
            const active = option.value === selected;
            const last = index === options.length - 1;
            return (
              <Pressable
                key={option.value}
                style={[styles.option, !last && styles.optionBorder]}
                onPress={() => onSelect(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  ) : null}
                </View>
                {active ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {placeholderNote ? <Text style={styles.note}>{placeholderNote}</Text> : null}
      </ScrollView>
    </ScreenScaffold>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    subtitle: {
      marginBottom: 12,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 20,
    },
    group: {
      marginTop: 4,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      backgroundColor: 'transparent',
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionText: {
      flex: 1,
      minWidth: 0,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    optionLabelActive: {
      fontWeight: '600',
    },
    optionDescription: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 17,
    },
    note: {
      marginTop: 24,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 18,
      opacity: 0.85,
    },
  });
}
