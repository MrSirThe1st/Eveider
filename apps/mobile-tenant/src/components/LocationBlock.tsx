import { borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DriverPlace } from '../lib/driver-presentation';
import { getDriverInstructionsTitle } from '../lib/driver-presentation';
import { useColors } from '../theme';
import { SectionLabel } from './SectionLabel';

type LocationBlockProps = {
  title: string;
  place: DriverPlace;
  emphasize?: boolean;
  /** Muted, compact block for completed stops (e.g. origin after pickup). */
  secondary?: boolean;
  compartmentLabel?: string | null;
  footnote?: string | null;
  /** Hide the role/action overline when the section title already carries meaning. */
  hideAction?: boolean;
};

/** Origin / destination block for driver delivery detail. */
export function LocationBlock({
  title,
  place,
  emphasize = false,
  secondary = false,
  compartmentLabel,
  footnote,
  hideAction = false,
}: LocationBlockProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.block,
        emphasize && styles.emphasize,
        secondary && styles.secondary,
      ]}
    >
      <SectionLabel>{title}</SectionLabel>
      {!hideAction ? <Text style={styles.action}>{place.action}</Text> : null}
      <Text style={[styles.name, secondary && styles.nameSecondary]} numberOfLines={2}>
        {place.name}
      </Text>
      {place.address ? (
        <Text style={styles.address} numberOfLines={3} ellipsizeMode="tail">
          {place.address}
        </Text>
      ) : null}
      {compartmentLabel ? (
        <Text style={styles.compartment}>
          {compartmentLabel.startsWith('Compartiment')
            ? compartmentLabel
            : `Compartiment ${compartmentLabel}`}
        </Text>
      ) : null}
      {place.contactName || place.contactPhone ? (
        <Text style={styles.meta}>
          {[place.contactName, place.contactPhone].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      {place.instructions && !secondary ? (
        <View style={styles.instructions}>
          <Text style={styles.instructionsLabel}>{getDriverInstructionsTitle(place)}</Text>
          <Text style={styles.instructionsBody}>{place.instructions}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    block: {
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 8,
    },
    emphasize: {
      borderColor: colors.primary,
    },
    secondary: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingVertical: 12,
    },
    action: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.secondary,
    },
    nameSecondary: {
      fontSize: 15,
      fontWeight: '600',
    },
    address: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: colors.textMuted,
    },
    compartment: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    meta: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
    },
    footnote: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    instructions: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: borders.width,
      borderTopColor: colors.border,
      gap: 4,
    },
    instructionsLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    instructionsBody: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: colors.secondary,
    },
  });
}
