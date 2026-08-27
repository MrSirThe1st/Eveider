import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { openDispatcherWhatsApp, type DispatcherWhatsAppContext } from '../lib/support';
import { useColors } from '../theme';

type DispatcherContactButtonProps = {
  context?: DispatcherWhatsAppContext;
};

export function DispatcherContactButton({ context }: DispatcherContactButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => openDispatcherWhatsApp(context)}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Contacter le dispatch sur WhatsApp"
    >
      <Text style={styles.label}>WHATSAPP DISPATCH</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      marginTop: 12,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.button,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    label: {
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.secondary,
    },
  });
}
