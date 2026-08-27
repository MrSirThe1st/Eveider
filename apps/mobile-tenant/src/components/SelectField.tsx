import { nativeRadius as radius, spacing, borders, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '../theme';

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type SelectFieldProps<T extends string> = {
  label: string;
  value: T | '';
  options: SelectOption<T>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
  emptyLabel?: string;
};

function matchesQuery(label: string, query: string) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
  placeholder,
  searchable = false,
  emptyLabel,
}: SelectFieldProps<T>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? '');

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [selected?.label]);

  const visibleOptions = searchable && query.trim()
    ? options.filter((option) => matchesQuery(option.label, query))
    : options;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, open && styles.fieldOpen]}>
        {searchable ? (
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              onOpenChange(true);
            }}
            onFocus={() => onOpenChange(true)}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
          />
        ) : (
          <Pressable
            onPress={() => onOpenChange(!open)}
            style={styles.trigger}
            accessibilityRole="button"
          >
            <Text style={[styles.value, !selected && styles.placeholder]}>
              {selected?.label ?? placeholder ?? ''}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={() => onOpenChange(!open)} hitSlop={8} accessibilityRole="button">
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} />
        </Pressable>
      </View>
      {open ? (
        <ScrollView style={styles.menu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {visibleOptions.length === 0 ? (
            <Text style={styles.empty}>{emptyLabel ?? placeholder ?? ''}</Text>
          ) : (
            visibleOptions.map((option, index) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    onOpenChange(false);
                  }}
                  style={[
                    styles.item,
                    active && styles.itemActive,
                    index < visibleOptions.length - 1 && styles.itemBorder,
                  ]}
                >
                  <Text style={styles.itemLabel}>{option.label}</Text>
                  {active ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
      marginBottom: 6,
    },
    field: {
      minHeight: spacing.inputHeight,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.input,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldOpen: {
      borderColor: colors.secondary,
    },
    trigger: {
      flex: 1,
      minHeight: spacing.inputHeight,
      justifyContent: 'center',
      marginRight: 8,
    },
    input: {
      flex: 1,
      minHeight: spacing.inputHeight,
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
      marginRight: 8,
      paddingVertical: 0,
    },
    value: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
    },
    placeholder: {
      color: colors.textMuted,
    },
    menu: {
      marginTop: 6,
      maxHeight: 280,
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.input,
      overflow: 'hidden',
    },
    item: {
      minHeight: 44,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemActive: {
      backgroundColor: colors.background,
    },
    itemBorder: {
      borderBottomWidth: borders.width,
      borderBottomColor: colors.border,
    },
    itemLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.secondary,
      marginRight: 8,
    },
    empty: {
      paddingHorizontal: 12,
      paddingVertical: 14,
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
