import { radius, borders, type ColorTokens } from '@eveider/config-ui';
import type { IssueType } from '@eveider/domain';
import { ISSUE_TYPE_LABELS } from '@eveider/domain';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DriverIssueReason } from '../lib/driver-presentation';
import { useColors } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type ReportIssueFormProps = {
  allowedTypes?: IssueType[];
  reasons?: DriverIssueReason[];
  parcelId?: string;
  lockerId?: string;
  onSubmit: (input: { type: IssueType; description: string }) => Promise<string | null>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ReportIssueForm({
  allowedTypes,
  reasons = [],
  onSubmit,
  onSuccess,
  onCancel,
}: ReportIssueFormProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reasonId, setReasonId] = useState<string | null>(reasons[0]?.id ?? null);
  const selectedReason = reasons.find((item) => item.id === reasonId) ?? reasons[0] ?? null;
  const fallbackType = allowedTypes?.[0] ?? 'parcel_problem';
  const [type, setType] = useState<IssueType>(selectedReason?.type ?? fallbackType);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectReason(reason: DriverIssueReason) {
    setReasonId(reason.id);
    setType(reason.type);
  }

  async function handleSubmit() {
    if (reasons.length > 0 && !selectedReason) {
      setError('Choisissez la raison du problème.');
      return;
    }
    if (!description.trim() && !selectedReason) {
      setError('Décrivez le problème rencontré.');
      return;
    }

    const detail = description.trim();
    const composed = selectedReason
      ? detail
        ? `${selectedReason.label}. ${detail}`
        : selectedReason.label
      : detail;

    setSubmitting(true);
    setError(null);
    const result = await onSubmit({
      type: selectedReason?.type ?? type,
      description: composed,
    });
    setSubmitting(false);

    if (result) {
      setError(result);
      return;
    }

    onSuccess();
  }

  const canSubmit = reasons.length > 0 ? Boolean(selectedReason) : Boolean(description.trim());

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Choisissez la raison la plus proche. Le dispatch Eveider sera notifié pour traiter
        l’exception.
      </Text>

      {reasons.length > 0 ? (
        <>
          <Text style={styles.label}>RAISON</Text>
          <View style={styles.typeList}>
            {reasons.map((item) => {
              const selected = item.id === selectedReason?.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => selectReason(item)}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : allowedTypes && allowedTypes.length > 0 ? (
        <>
          <Text style={styles.label}>TYPE D&apos;INCIDENT</Text>
          <View style={styles.typeList}>
            {allowedTypes.map((item) => {
              const selected = item === type;
              return (
                <Pressable
                  key={item}
                  onPress={() => setType(item)}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {ISSUE_TYPE_LABELS[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>DÉTAILS (OPTIONNEL)</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Précisions utiles pour le dispatch…"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="ENVOYER LE SIGNALEMENT"
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!canSubmit}
      />
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>ANNULER</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    hint: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 20,
      color: colors.secondary,
      marginBottom: 8,
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.secondary,
    },
    typeList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    typeChip: {
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.button,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    typeChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    typeChipText: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.3,
      color: colors.secondary,
    },
    typeChipTextSelected: {
      color: colors.onPrimary,
    },
    input: {
      minHeight: 100,
      borderWidth: borders.width,
      borderColor: colors.border,
      borderRadius: radius.card,
      padding: 14,
      fontSize: 14,
      fontWeight: '500',
      color: colors.secondary,
      backgroundColor: colors.surface,
    },
    error: {
      color: colors.danger,
      fontWeight: '500',
      fontSize: 13,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    cancelText: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: colors.secondary,
      opacity: 0.7,
    },
  });
}
