import { borders, type ColorTokens } from '@eveider/config-ui';
import { DRIVER_VEHICLE_TYPE_LABELS, type DriverVehicleType } from '@eveider/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '../theme';

export type VehicleInfoValue = {
  type: string | null;
  makeModel: string | null;
  plate: string | null;
  color: string | null;
};

type VehicleInfoProps = {
  value: VehicleInfoValue;
  editable?: boolean;
  onChange?: (next: VehicleInfoValue) => void;
};

const VEHICLE_TYPES = Object.keys(DRIVER_VEHICLE_TYPE_LABELS) as DriverVehicleType[];

const VEHICLE_ICONS: Record<DriverVehicleType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  on_foot: 'walk',
  bicycle: 'bicycle',
  motorcycle: 'motorbike',
  car: 'car',
  van: 'van-utility',
};

export function VehicleInfo({ value, editable = false, onChange }: VehicleInfoProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedType =
    value.type && value.type in DRIVER_VEHICLE_TYPE_LABELS
      ? (value.type as DriverVehicleType)
      : null;

  function setField<K extends keyof VehicleInfoValue>(key: K, next: VehicleInfoValue[K]) {
    onChange?.({ ...value, [key]: next });
  }

  return (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>{t('driverProfile.vehicle')}</Text>

      {editable ? (
        <View style={styles.typeRow}>
          {VEHICLE_TYPES.map((type) => {
            const active = value.type === type;
            return (
              <Pressable
                key={type}
                onPress={() => setField('type', type)}
                style={[styles.typeChip, active && styles.typeChipActive]}
                accessibilityRole="button"
                accessibilityLabel={DRIVER_VEHICLE_TYPE_LABELS[type]}
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons
                  name={VEHICLE_ICONS[type]}
                  size={22}
                  color={active ? colors.successFg : colors.secondary}
                />
              </Pressable>
            );
          })}
        </View>
      ) : selectedType ? (
        <View
          style={styles.readIcon}
          accessibilityLabel={DRIVER_VEHICLE_TYPE_LABELS[selectedType]}
        >
          <MaterialCommunityIcons
            name={VEHICLE_ICONS[selectedType]}
            size={24}
            color={colors.secondary}
          />
        </View>
      ) : (
        <Text style={styles.readValue}>{t('driverProfile.notProvided')}</Text>
      )}

      <Field
        label={t('driverProfile.vehicleMakeModel')}
        value={value.makeModel ?? ''}
        editable={editable}
        onChangeText={(text) => setField('makeModel', text)}
        styles={styles}
        colors={colors}
      />
      <Field
        label={t('driverProfile.vehiclePlate')}
        value={value.plate ?? ''}
        editable={editable}
        onChangeText={(text) => setField('plate', text)}
        styles={styles}
        colors={colors}
        autoCapitalize="characters"
      />
      <Field
        label={t('driverProfile.vehicleColor')}
        value={value.color ?? ''}
        editable={editable}
        onChangeText={(text) => setField('color', text)}
        styles={styles}
        colors={colors}
        last
      />
    </View>
  );
}

function Field({
  label,
  value,
  editable,
  onChangeText,
  styles,
  colors,
  autoCapitalize,
  last = false,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText: (text: string) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ColorTokens;
  autoCapitalize?: 'characters' | 'none' | 'sentences';
  last?: boolean;
}) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={autoCapitalize}
        />
      ) : (
        <Text style={styles.readValue}>{value.trim() || '—'}</Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    block: {
      marginTop: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 10,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    typeChip: {
      borderWidth: borders.width,
      borderColor: colors.border,
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.successMuted,
    },
    readIcon: {
      alignSelf: 'flex-start',
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    field: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 6,
    },
    fieldLast: {
      borderBottomWidth: 0,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    input: {
      borderWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
    readValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.secondary,
    },
  });
}
