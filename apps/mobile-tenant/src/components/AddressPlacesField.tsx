import { radius, type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchMapPlaces, type MapPlaceResult } from '../lib/api';
import { useColors } from '../theme';

export type AddressPlacesFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSelectPlace: (place: MapPlaceResult) => void;
  placeholder?: string;
  proximity?: { latitude: number; longitude: number } | null;
  /** When false, pause search (e.g. modal closed). Default true. */
  active?: boolean;
  autoFocus?: boolean;
};

export function AddressPlacesField({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
  proximity = null,
  active = true,
  autoFocus = false,
}: AddressPlacesFieldProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [results, setResults] = useState<MapPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRequestId = useRef(0);
  const suppressSearchRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (suppressSearchRef.current) {
      setSearching(false);
      return;
    }

    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearching(true);
    const timer = setTimeout(() => {
      void (async () => {
        const result = await searchMapPlaces(query, {
          latitude: proximity?.latitude,
          longitude: proximity?.longitude,
          limit: 8,
        });
        if (requestId !== searchRequestId.current || suppressSearchRef.current) return;
        if (!result.success) {
          setError(result.error);
          setResults([]);
          setSearching(false);
          return;
        }
        setError(null);
        setResults(result.data.places);
        setSearching(false);
      })();
    }, 320);

    return () => clearTimeout(timer);
  }, [value, proximity?.latitude, proximity?.longitude, active]);

  function handleChangeText(next: string) {
    suppressSearchRef.current = false;
    onChangeText(next);
  }

  function handleSelect(place: MapPlaceResult) {
    suppressSearchRef.current = true;
    searchRequestId.current += 1;
    setResults([]);
    setSearching(false);
    setError(null);
    onChangeText(place.label);
    onSelectPlace(place);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Feather name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? t('maps.addressPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {results.length > 0 ? (
        <View style={styles.listbox} accessibilityRole="list">
          {results.map((place, index) => (
            <Pressable
              key={place.id}
              onPress={() => handleSelect(place)}
              style={[styles.option, index < results.length - 1 && styles.optionBorder]}
              accessibilityRole="button"
            >
              <Text style={styles.optionLabel} numberOfLines={2}>
                {place.label}
              </Text>
              {place.placeTypeLabel ? (
                <Text style={styles.optionMeta}>{place.placeTypeLabel}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type ResolveDestinationModalProps = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  onResolved: (place: MapPlaceResult) => void;
};

/** Modal Places search used when a stop has no coordinates. */
export function ResolveDestinationModal({
  open,
  onClose,
  initialQuery = '',
  onResolved,
}: ResolveDestinationModalProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('maps.resolveTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Feather name="x" size={22} color={colors.secondary} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>{t('maps.resolveHint')}</Text>
          <AddressPlacesField
            value={query}
            onChangeText={setQuery}
            onSelectPlace={(place) => {
              onResolved(place);
              onClose();
            }}
            active={open}
            autoFocus
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      zIndex: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
      padding: 0,
    },
    error: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.danger,
    },
    listbox: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '100%',
      marginTop: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      maxHeight: 240,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      zIndex: 10,
      elevation: 8,
    },
    option: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondary,
    },
    optionMeta: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      minHeight: 280,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.secondary,
    },
    modalHint: {
      marginBottom: 12,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
