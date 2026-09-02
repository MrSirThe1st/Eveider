'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import type { ParcelImportPreviewRow } from '@eveider/api-contracts';
import {
  Button,
  InlineAlert,
  Modal,
  useToast,
} from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent } from 'react';
import { downloadExport } from '@/lib/export/download-export';

type ImportStep = 'upload' | 'preview' | 'result';

type ImportResultRow = {
  rowNumber: number;
  success: boolean;
  trackingNumber?: string;
  error?: string;
};

export function ParcelImportWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ParcelImportPreviewRow[]>([]);
  const [ignoreErrors, setIgnoreErrors] = useState(true);
  const [results, setResults] = useState<ImportResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validRows = useMemo(() => rows.filter((row) => row.valid && row.data), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => !row.valid), [rows]);

  function reset() {
    setStep('upload');
    setFile(null);
    setRows([]);
    setResults([]);
    setError(null);
    setIgnoreErrors(true);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleDownloadTemplate() {
    try {
      await downloadExport('/api/organisation/parcels/import/template');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Téléchargement impossible', 'Modèle Excel');
    }
  }

  async function handlePreview() {
    if (!file) {
      setError('Sélectionnez un fichier Excel (.xlsx).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/organisation/parcels/import/preview', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!payload.success) {
        setError(payload.error ?? 'Analyse impossible');
        return;
      }
      setRows(payload.data.rows as ParcelImportPreviewRow[]);
      setStep('preview');
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (validRows.length === 0) {
      setError('Aucune ligne valide à importer.');
      return;
    }
    if (!ignoreErrors && invalidRows.length > 0) {
      setError('Corrigez les lignes en erreur ou cochez « Ignorer les lignes en erreur ».');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/organisation/parcels/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ignoreErrors,
          rows: validRows.map((row) => ({
            rowNumber: row.rowNumber,
            data: row.data,
          })),
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setError(payload.error ?? 'Import impossible');
        return;
      }
      setResults(payload.data.results as ImportResultRow[]);
      setStep('result');
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadErrorReport() {
    const errorRows = [
      ...invalidRows.map((row) => ({ rowNumber: row.rowNumber, errors: row.errors })),
      ...results
        .filter((result) => !result.success)
        .map((result) => ({
          rowNumber: result.rowNumber,
          errors: [result.error ?? 'Erreur inconnue'],
        })),
    ];
    if (errorRows.length === 0) return;

    try {
      const response = await fetch('/api/organisation/parcels/import/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: errorRows }),
      });
      if (!response.ok) {
        throw new Error('Rapport impossible');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'rapport-erreurs-import.xlsx';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rapport impossible', 'Excel');
    }
  }

  const createdCount = results.filter((result) => result.success).length;
  const failedCount = results.filter((result) => !result.success).length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer des colis (Excel)"
      maxWidth={720}
      footer={
        step === 'upload' ? (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Annuler
            </Button>
            <Button variant="primary" disabled={loading || !file} onClick={() => void handlePreview()}>
              {loading ? 'Analyse…' : 'Analyser le fichier'}
            </Button>
          </>
        ) : step === 'preview' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Retour
            </Button>
            <Button variant="primary" disabled={loading || validRows.length === 0} onClick={() => void handleConfirm()}>
              {loading ? 'Import…' : `Importer ${validRows.length} colis`}
            </Button>
          </>
        ) : (
          <>
            {(invalidRows.length > 0 || failedCount > 0) && (
              <Button variant="secondary" onClick={() => void handleDownloadErrorReport()}>
                Rapport d’erreurs
              </Button>
            )}
            <Button variant="primary" onClick={handleClose}>
              Fermer
            </Button>
          </>
        )
      }
    >
      {error ? <InlineAlert variant="error" message={error} /> : null}

      {step === 'upload' ? (
        <div style={{ display: 'grid', gap: spacing[4] }}>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: typography.body.fontSize }}>
            Téléchargez le modèle, remplissez jusqu’à 500 lignes, puis importez le fichier .xlsx.
          </p>
          <Button variant="secondary" onClick={() => void handleDownloadTemplate()}>
            Télécharger le modèle Excel
          </Button>
          <label style={{ display: 'grid', gap: spacing[2] }}>
            <span style={{ fontWeight: 600 }}>Fichier Excel</span>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} />
          </label>
        </div>
      ) : null}

      {step === 'preview' ? (
        <div style={{ display: 'grid', gap: spacing[4] }}>
          <p style={{ margin: 0 }}>
            {validRows.length} ligne{validRows.length > 1 ? 's' : ''} valide{validRows.length > 1 ? 's' : ''}
            {invalidRows.length > 0
              ? ` · ${invalidRows.length} en erreur`
              : ''}
          </p>
          <label style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={ignoreErrors}
              onChange={(event) => setIgnoreErrors(event.target.checked)}
            />
            <span>Ignorer les lignes en erreur</span>
          </label>
          <div style={{ maxHeight: 320, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.caption.fontSize }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: spacing[2] }}>Ligne</th>
                  <th style={{ textAlign: 'left', padding: spacing[2] }}>Statut</th>
                  <th style={{ textAlign: 'left', padding: spacing[2] }}>Destinataire</th>
                  <th style={{ textAlign: 'left', padding: spacing[2] }}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td style={{ padding: spacing[2] }}>{row.rowNumber}</td>
                    <td style={{ padding: spacing[2], color: row.valid ? colors.success : colors.danger }}>
                      {row.valid ? 'Valide' : 'Erreur'}
                    </td>
                    <td style={{ padding: spacing[2] }}>{row.data?.recipientName ?? '—'}</td>
                    <td style={{ padding: spacing[2], color: colors.textMuted }}>
                      {row.valid ? row.data?.reference ?? row.data?.recipientPhone : row.errors.join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {step === 'result' ? (
        <div style={{ display: 'grid', gap: spacing[3] }}>
          <InlineAlert
            variant={failedCount > 0 ? 'info' : 'success'}
            message={`${createdCount} colis créé${createdCount > 1 ? 's' : ''}${failedCount > 0 ? ` · ${failedCount} échec${failedCount > 1 ? 's' : ''}` : ''}`}
          />
          {failedCount > 0 ? (
            <p style={{ margin: 0, color: colors.textMuted }}>
              Téléchargez le rapport d’erreurs pour corriger les lignes restantes.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
