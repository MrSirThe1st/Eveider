import { nativeRadius as radius, borders, type ColorTokens } from '@eveider/config-ui';
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
  mode: 'CLIENT' | 'COURSIER';
  title: string;
  subtitle?: string;
  options: SettingsOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onBack: () => void;
  placeholderNote?: string;
};

export function SettingsOptionGroup<T extends string>({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onBack,
  placeholderNote = 'Cette préférence est enregistrée localement. L’application complète sera disponible prochainement.',
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
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  active && styles.optionActive,
                  index < options.length - 1 && styles.optionBorder,
                ]}
                onPress={() => onSelect(option.value)}
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
                  <Feather name="check" size={18} color={colors.primary} strokeWidth={2.5} />
                ) : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.note}>
          <Feather name="info" size={14} color={colors.secondary} />
          <Text style={styles.noteText}>{placeholderNote}</Text>
        </View>
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
      padding: 20,
      paddingBottom: 40,
    },
    subtitle: {
      marginBottom: 16,
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
      opacity: 0.75,
      lineHeight: 20,
    },
    group: {
      borderWidth: borders.width,
      borderColor: colors.border,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      padding: 14,
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionActive: {
      backgroundColor: colors.surfaceSubtle,
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondary,
    },
    optionLabelActive: {
      color: colors.secondary,
    },
    optionDescription: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '500',
      color: colors.secondary,
      opacity: 0.7,
      lineHeight: 16,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
    },
    note: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
    },
    noteText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
      color: colors.secondary,
      opacity: 0.75,
      lineHeight: 16,
    },
  });
}
