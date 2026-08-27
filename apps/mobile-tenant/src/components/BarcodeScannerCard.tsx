import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type BarcodeScannerCardProps = {
  onScan: (value: string) => void;
};

export function BarcodeScannerCard({ onScan }: BarcodeScannerCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (Platform.OS === 'web') {
    return null;
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.hint}>Autorisez la caméra pour scanner le colis.</Text>
        <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
          <Text style={styles.permissionText}>AUTORISER LA CAMÉRA</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'pdf417'],
        }}
        onBarcodeScanned={({ data }) => {
          if (scanned || !data.trim()) return;
          setScanned(true);
          onScan(data.trim());
        }}
      />
      {scanned ? (
        <Pressable onPress={() => setScanned(false)} style={styles.rescan}>
          <Text style={styles.rescanText}>SCANNER À NOUVEAU</Text>
        </Pressable>
      ) : (
        <Text style={styles.overlayHint}>Alignez le code-barres dans le cadre</Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    frame: {
      height: 220,
      borderRadius: radius.card,
      overflow: 'hidden',
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
    },
    camera: {
      flex: 1,
    },
    overlayHint: {
      position: 'absolute',
      bottom: 12,
      alignSelf: 'center',
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    rescan: {
      position: 'absolute',
      bottom: 12,
      alignSelf: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.button,
    },
    rescanText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.onPrimary,
    },
    fallback: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.card,
      padding: 16,
      gap: 12,
      backgroundColor: colors.surface,
    },
    hint: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondary,
    },
    permissionButton: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.button,
      backgroundColor: colors.primary,
    },
    permissionText: {
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.onPrimary,
    },
  });
}
