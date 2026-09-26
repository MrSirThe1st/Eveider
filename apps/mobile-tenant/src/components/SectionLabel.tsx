import { type ColorTokens } from '@eveider/config-ui';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type SectionLabelProps = {
  children: ReactNode;
  spaced?: boolean;
};

/** Uppercase muted overline — same language as destinataire detail sections. */
export function SectionLabel({ children, spaced = false }: SectionLabelProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={[styles.label, spaced && styles.spaced]}>{children}</Text>;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginBottom: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    spaced: {
      marginTop: 20,
    },
  });
}
