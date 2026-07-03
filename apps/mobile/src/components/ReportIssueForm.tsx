import { colors, radius } from '@eveider/config-ui';
import type { IssueType } from '@eveider/domain';
import { ISSUE_TYPE_LABELS } from '@eveider/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';

type ReportIssueFormProps = {
  allowedTypes: IssueType[];
  parcelId?: string;
  lockerId?: string;
  onSubmit: (input: { type: IssueType; description: string }) => Promise<string | null>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ReportIssueForm({
  allowedTypes,
  onSubmit,
  onSuccess,
  onCancel,
}: ReportIssueFormProps) {
  const [type, setType] = useState<IssueType>(allowedTypes[0] ?? 'parcel_problem');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Décrivez le problème rencontré.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ type, description: description.trim() });
    setSubmitting(false);

    if (result) {
      setError(result);
      return;
    }

    onSuccess();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Décrivez le problème. L'équipe Eveider sera notifiée et traitera votre signalement.
      </Text>

      <Text style={styles.label}>TYPE D'INCIDENT</Text>
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

      <Text style={styles.label}>DESCRIPTION</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Que s'est-il passé ?"
        placeholderTextColor={colors.border}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="ENVOYER LE SIGNALEMENT"
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!description.trim()}
      />
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>ANNULER</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
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
    color: colors.secondary,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
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
