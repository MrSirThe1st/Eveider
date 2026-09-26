import { type ColorTokens } from '@eveider/config-ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppSpinner } from '../../components/AppSpinner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenScaffold } from '../../components/ScreenHeader';
import { VehicleInfo, type VehicleInfoValue } from '../../components/VehicleInfo';
import {
  deleteCourierDriverPhoto,
  fetchCourierDriverPhotoDataUrl,
  fetchCourierDriverProfile,
  updateCourierDriverProfile,
  uploadCourierDriverPhoto,
  type CourierDriverDocumentStatus,
  type CourierDriverProfile,
} from '../../lib/api';
import { useColors } from '../../theme';

type DriverProfileScreenProps = {
  onBack: () => void;
};

function documentStatusLabel(
  status: CourierDriverDocumentStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (status) {
    case 'verified':
      return t('driverProfile.docVerified');
    case 'pending':
      return t('driverProfile.docPending');
    case 'needs_correction':
      return t('driverProfile.docNeedsCorrection');
    default:
      return t('driverProfile.docMissing');
  }
}

export function DriverProfileScreen({ onBack }: DriverProfileScreenProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [profile, setProfile] = useState<CourierDriverProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfoValue>({
    type: null,
    makeModel: null,
    plate: null,
    color: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const result = await fetchCourierDriverProfile();
    if (!silent) setLoading(false);
    setRefreshing(false);
    if (!result.success) {
      setError(result.error);
      setProfile(null);
      setPhotoUri(null);
      return;
    }
    setProfile(result.data);
    setVehicle({
      type: result.data.vehicle?.type ?? null,
      makeModel: result.data.vehicle?.makeModel ?? null,
      plate: result.data.vehicle?.plate ?? null,
      color: result.data.vehicle?.color ?? null,
    });
    if (result.data.profilePhotoUrl) {
      const photo = await fetchCourierDriverPhotoDataUrl();
      setPhotoUri(photo.success ? photo.data : null);
    } else {
      setPhotoUri(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveVehicle() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateCourierDriverProfile({
      vehicleType: vehicle.type,
      vehicleMakeModel: vehicle.makeModel,
      vehiclePlate: vehicle.plate,
      vehicleColor: vehicle.color,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setVehicle({
      type: result.data.vehicle.type,
      makeModel: result.data.vehicle.makeModel,
      plate: result.data.vehicle.plate,
      color: result.data.vehicle.color,
    });
    setSaved(true);
  }

  async function openCamera() {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setError(t('driverProfile.cameraDenied'));
        return;
      }
    }
    setCameraOpen(true);
  }

  async function capturePhoto() {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.45,
        base64: true,
        exif: false,
      });
      if (!photo?.base64) {
        setError(t('driverProfile.photoFailed'));
        return;
      }
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const result = await uploadCourierDriverPhoto(dataUrl);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPhotoUri(dataUrl);
      setCameraOpen(false);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    const result = await deleteCourierDriverPhoto();
    setPhotoBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPhotoUri(null);
  }

  if (loading && !profile) {
    return (
      <ScreenScaffold title={t('driverProfile.title')} onBack={onBack}>
        <AppSpinner />
      </ScreenScaffold>
    );
  }

  const name = profile?.fullName?.trim() || t('profile.account');
  const organizationName =
    profile?.organization?.name ||
    (profile?.contractorType === 'eveider' ? 'Eveider' : t('driverProfile.organizationUnknown'));

  return (
    <ScreenScaffold title={t('driverProfile.title')} onBack={onBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.secondary}
          />
        }
      >
        {error ? (
          <View style={styles.feedback}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label={t('common.retry')} onPress={() => void load()} />
          </View>
        ) : null}

        {profile ? (
          <>
            <View style={styles.hero}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.heroText}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.badge}>{profile.accountStatusLabel}</Text>
                <View style={styles.photoActions}>
                  <Pressable onPress={() => void openCamera()} disabled={photoBusy}>
                    <Text style={styles.photoAction}>
                      {photoUri
                        ? t('driverProfile.changePhoto')
                        : t('driverProfile.addPhoto')}
                    </Text>
                  </Pressable>
                  {photoUri ? (
                    <Pressable onPress={() => void removePhoto()} disabled={photoBusy}>
                      <Text style={styles.photoActionMuted}>{t('driverProfile.removePhoto')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
            <InfoRow
              label={t('driverProfile.phone')}
              value={profile.phone || t('driverProfile.notProvided')}
              styles={styles}
            />
            <InfoRow
              label={t('driverProfile.organization')}
              value={organizationName}
              styles={styles}
            />
            <InfoRow
              label={t('driverProfile.driverId')}
              value={profile.driverCode}
              styles={styles}
            />
            <InfoRow
              label={t('driverProfile.accountStatus')}
              value={profile.accountStatusLabel}
              styles={styles}
              last
            />

            <VehicleInfo value={vehicle} editable onChange={setVehicle} />
            <PrimaryButton
              label={t('driverProfile.saveVehicle')}
              onPress={() => void handleSaveVehicle()}
              loading={saving}
              variant="brand"
            />
            {saved ? <Text style={styles.saved}>Véhicule enregistré</Text> : null}

            {profile.documents.length > 0 ? (
              <View style={styles.docs}>
                <Text style={styles.sectionTitle}>{t('driverProfile.documents')}</Text>
                {profile.documents.map((doc, index) => (
                  <View
                    key={doc.key}
                    style={[
                      styles.docRow,
                      index === profile.documents.length - 1 && styles.docRowLast,
                    ]}
                  >
                    <Text style={styles.docLabel}>
                      {doc.key === 'identity' ? t('driverProfile.docIdentity') : doc.key}
                    </Text>
                    <Text
                      style={[
                        styles.docStatus,
                        doc.status === 'verified' ? styles.docOk : null,
                      ]}
                    >
                      {documentStatusLabel(doc.status, t)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraShell}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraBar}>
            <Pressable onPress={() => setCameraOpen(false)}>
              <Text style={styles.cameraBarText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={() => void capturePhoto()} disabled={photoBusy}>
              <Text style={styles.cameraBarText}>
                {photoBusy ? '…' : t('driverProfile.capturePhoto')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

function InfoRow({
  label,
  value,
  styles,
  last = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    feedback: { gap: 10, marginBottom: 12 },
    error: { color: colors.danger, fontSize: 14, fontWeight: '500' },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      paddingVertical: 4,
    },
    photo: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceMuted,
    },
    photoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPlaceholderText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    heroText: { flex: 1, minWidth: 0 },
    name: { fontSize: 17, fontWeight: '700', color: colors.secondary },
    badge: { marginTop: 2, fontSize: 13, fontWeight: '600', color: colors.primary },
    photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
    photoAction: { fontSize: 13, fontWeight: '600', color: colors.primary },
    photoActionMuted: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 4,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
      flexShrink: 0,
    },
    infoValue: {
      flex: 1,
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'right',
    },
    saved: { marginTop: 10, fontSize: 13, color: colors.primary, fontWeight: '600' },
    docs: { marginTop: 8 },
    docRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    docRowLast: {
      borderBottomWidth: 0,
    },
    docLabel: { fontSize: 16, color: colors.secondary, fontWeight: '500', flex: 1 },
    docStatus: { fontSize: 14, color: colors.textMuted, fontWeight: '400' },
    docOk: { color: colors.primary, fontWeight: '600' },
    cameraShell: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    cameraBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 36,
      backgroundColor: '#111',
    },
    cameraBarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
