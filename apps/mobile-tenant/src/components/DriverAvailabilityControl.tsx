import { type ColorTokens } from '@eveider/config-ui';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';
import { BottomSheet, BottomSheetOption } from './BottomSheet';

type DriverAvailabilityControlProps = {
  isAcceptingWork: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
};

export function DriverAvailabilityControl({
  isAcceptingWork,
  busy = false,
  onChange,
}: DriverAvailabilityControlProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={busy}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={
          isAcceptingWork ? t('courier.availableNow') : t('courier.unavailableNow')
        }
      >
        <View style={[styles.dot, isAcceptingWork ? styles.dotOn : styles.dotOff]} />
        <Text style={[styles.label, !isAcceptingWork && styles.labelOff]}>
          {isAcceptingWork ? t('courier.availableNow') : t('courier.unavailableNow')}
        </Text>
        <Feather
          name="chevron-down"
          size={14}
          color={isAcceptingWork ? colors.secondary : colors.textMuted}
        />
      </Pressable>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('courier.availabilityTitle')}
      >
        <BottomSheetOption
          active={isAcceptingWork}
          label={t('courier.availableNow')}
          detail={t('courier.availableDetail')}
          onPress={() => {
            onChange(true);
            setOpen(false);
          }}
        />
        <BottomSheetOption
          active={!isAcceptingWork}
          label={t('courier.unavailableNow')}
          detail={t('courier.unavailableDetail')}
          last
          onPress={() => {
            onChange(false);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    trigger: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingRight: 4,
      marginBottom: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    dotOn: {
      backgroundColor: colors.successFg,
    },
    dotOff: {
      backgroundColor: colors.textMuted,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondary,
    },
    labelOff: {
      color: colors.textMuted,
      fontWeight: '500',
    },
  });
}
