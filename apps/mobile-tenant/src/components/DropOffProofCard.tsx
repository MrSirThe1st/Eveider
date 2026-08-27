import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '../theme';

type DropOffProofCardProps = {
  photoBase64: string | null;
  onCapture: (photoBase64: string) => void;
  onRetake: () => void;
};

export function DropOffProofCard({ photoBase64, onCapture, onRetake }: DropOffProofCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.35,
        base64: true,
        exif: false,
      });
      if (photo?.base64) {
        onCapture(`data:image/jpeg;base64,${photo.base64}`);
      }
    } finally {
      setCapturing(false);
    }
  }

  if (photoBase64) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: photoBase64 }} style={styles.preview} />
        <Pressable onPress={onRetake} style={styles.retake}>
          <Text style={styles.retakeText}>REPRENDRE LA PHOTO</Text>
        </Pressable>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.hint}>
          La preuve de dépôt se photographie depuis le téléphone du coursier, une fois le colis
          dans le compartiment.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.hint}>Autorisez la caméra pour photographier le dépôt.</Text>
        <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
          <Text style={styles.permissionText}>AUTORISER LA CAMÉRA</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <Pressable onPress={() => void handleCapture()} style={styles.shutter} disabled={capturing}>
        <Text style={styles.shutterText}>{capturing ? '…' : 'PRENDRE LA PHOTO'}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    frame: {
      height: 280,
      borderRadius: radius.card,
      overflow: 'hidden',
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
    },
    camera: {
      flex: 1,
    },
    shutter: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      right: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radius.button,
    },
    shutterText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.onPrimary,
    },
    previewWrap: {
      gap: 12,
    },
    preview: {
      height: 280,
      borderRadius: radius.card,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
    },
    retake: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.button,
      borderWidth: borders.width,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    retakeText: {
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.secondary,
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
