'use client';

import { colors, radius, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  cycleCompartmentSize,
  resizeLayoutCells,
  resolveLockerLayout,
  type CompartmentCell,
  type CompartmentSize,
} from '@eveider/domain';
import { Button, useToast } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LockerLayoutPreview, useLockerLayout } from '@/components/locker-layout-preview';
import { fetchJson } from '@/lib/api/fetch-json';
import type { LockerLayoutTemplateDto } from '@/server/locker-settings';

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
  width: '100%',
};

const dimensionInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 72,
  maxWidth: '100%',
};

const BULK_SIZES: CompartmentSize[] = ['small', 'medium', 'large'];

function parseGridDimension(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, parsed));
}

type LockerTemplateEditorProps = {
  mode: 'create' | 'edit';
  initial?: LockerLayoutTemplateDto;
};

export function LockerTemplateEditor({ mode, initial }: LockerTemplateEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [customRows, setCustomRows] = useState(initial?.rows ?? 3);
  const [customColumns, setCustomColumns] = useState(initial?.columns ?? 3);
  const [rowsInput, setRowsInput] = useState(String(initial?.rows ?? 3));
  const [columnsInput, setColumnsInput] = useState(String(initial?.columns ?? 3));
  const [cells, setCells] = useState<CompartmentCell[]>(
    () => initial?.cells ?? resolveLockerLayout('3x3').cells,
  );
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    setCells((previous) => resizeLayoutCells(customRows, customColumns, previous));
  }, [customRows, customColumns]);

  const layout = useLockerLayout('custom', customRows, customColumns, cells);
  const canSave = name.trim().length >= 2;

  function handleDimensionInputChange(
    raw: string,
    setInput: (value: string) => void,
    setDimension: (value: number) => void,
  ) {
    const digitsOnly = raw.replace(/\D/g, '');
    setInput(digitsOnly);
    if (digitsOnly === '') return;
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
      setDimension(parsed);
    }
  }

  function commitDimensionInput(
    raw: string,
    current: number,
    setDimension: (value: number) => void,
    setInput: (value: string) => void,
  ) {
    const value = parseGridDimension(raw, current);
    setDimension(value);
    setInput(String(value));
  }

  function handleCellClick(label: string) {
    setCells((previous) =>
      previous.map((cell) =>
        cell.label === label ? { ...cell, size: cycleCompartmentSize(cell.size) } : cell,
      ),
    );
  }

  function setAllCellSizes(size: CompartmentSize) {
    setCells((previous) => previous.map((cell) => ({ ...cell, size })));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        rows: layout.rows,
        columns: layout.columns,
        cells: layout.cells,
      };

      if (mode === 'create') {
        await fetchJson<{ template: LockerLayoutTemplateDto }>('/api/locker-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Modèle créé');
      } else if (initial) {
        await fetchJson<{ template: LockerLayoutTemplateDto }>(
          `/api/locker-templates/${initial.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        toast.success('Modèle mis à jour');
      }

      router.push('/tableau-de-bord/parametres/casiers/modeles');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!initial || initial.isStarter) return;
    if (!window.confirm(`Archiver le modèle « ${initial.name} » ?`)) return;
    setArchiving(true);
    try {
      await fetchJson(`/api/locker-templates/${initial.id}`, { method: 'DELETE' });
      toast.success('Modèle archivé');
      router.push('/tableau-de-bord/parametres/casiers/modeles');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’archiver');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NOM</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Standard mixte 3×4"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>DESCRIPTION</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optionnel"
          style={inputStyle}
        />
      </label>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>LIGNES</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={rowsInput}
            onChange={(e) => handleDimensionInputChange(e.target.value, setRowsInput, setCustomRows)}
            onBlur={() => commitDimensionInput(rowsInput, customRows, setCustomRows, setRowsInput)}
            style={dimensionInputStyle}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>COLONNES</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={columnsInput}
            onChange={(e) =>
              handleDimensionInputChange(e.target.value, setColumnsInput, setCustomColumns)
            }
            onBlur={() =>
              commitDimensionInput(columnsInput, customColumns, setCustomColumns, setColumnsInput)
            }
            style={dimensionInputStyle}
          />
        </label>
      </div>

      <div style={{ ...webCardStyle, padding: '1rem', background: colors.background }}>
        <p style={{ margin: '0 0 0.35rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          TAILLES DES COMPARTIMENTS
        </p>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
          Cliquez sur un compartiment pour faire défiler S → M → L.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '0.75rem' }}>
          {BULK_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setAllCellSizes(size)}
              style={{
                ...webSecondaryButtonStyle,
                padding: '0.35rem 0.65rem',
                fontSize: '0.6875rem',
                color: colors.secondary,
              }}
            >
              {COMPARTMENT_SIZE_FULL_LABELS[size]}
            </button>
          ))}
        </div>
        <LockerLayoutPreview layout={layout} interactive onCellClick={handleCellClick} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Button
          type="button"
          loading={saving}
          disabled={!canSave}
          onClick={() => void handleSave()}
          style={{ fontWeight: 700 }}
        >
          {mode === 'create' ? 'Créer le modèle' : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/tableau-de-bord/parametres/casiers/modeles')}
          style={{ fontWeight: 700 }}
        >
          Annuler
        </Button>
        {mode === 'edit' && initial && !initial.isStarter ? (
          <button
            type="button"
            disabled={archiving}
            onClick={() => void handleArchive()}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: colors.secondary,
              opacity: 0.7,
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: archiving ? 'wait' : 'pointer',
              borderRadius: radius.button,
            }}
          >
            Archiver
          </button>
        ) : null}
      </div>
    </div>
  );
}
