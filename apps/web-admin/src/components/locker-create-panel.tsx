'use client';

import { colors, radius, spacing } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  cycleCompartmentSize,
  resizeLayoutCells,
  resolveLockerLayout,
  type CompartmentCell,
  type CompartmentSize,
  type LockerLayoutPreset,
} from '@eveider/domain';
import { useEffect, useMemo, useState } from 'react';
import {
  LAYOUT_PRESET_LABELS,
  LockerLayoutPreview,
  useLockerLayout,
} from '@/components/locker-layout-preview';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
  border: `2px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
};

const dimensionInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 72,
  maxWidth: '100%',
};

function parseGridDimension(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, parsed));
}

type LockerCreatePanelProps = {
  address: string;
  onAddressChange: (value: string) => void;
  placementConfirmed: boolean;
  saving: boolean;
  onCreate: (input: {
    code?: string;
    name: string;
    address: string;
    rows: number;
    columns: number;
    compartments: CompartmentCell[];
    status: 'active' | 'offline';
  }) => void;
};

type CreateStatus = 'active' | 'offline';

const BULK_SIZES: CompartmentSize[] = ['small', 'medium', 'large'];

export function LockerCreatePanel({
  address,
  onAddressChange,
  placementConfirmed,
  saving,
  onCreate,
}: LockerCreatePanelProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [layoutPreset, setLayoutPreset] = useState<LockerLayoutPreset>('3x3');
  const [customRows, setCustomRows] = useState(3);
  const [customColumns, setCustomColumns] = useState(3);
  const [rowsInput, setRowsInput] = useState('3');
  const [columnsInput, setColumnsInput] = useState('3');
  const [cells, setCells] = useState<CompartmentCell[]>(() => resolveLockerLayout('3x3').cells);
  const [status, setStatus] = useState<CreateStatus>('active');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (layoutPreset === '3x3') {
      setCells(resolveLockerLayout('3x3').cells);
      return;
    }
    if (layoutPreset === '4x4') {
      setCells(resolveLockerLayout('4x4').cells);
      return;
    }
    setCells((previous) => resizeLayoutCells(customRows, customColumns, previous));
  }, [layoutPreset, customRows, customColumns]);

  const layout = useLockerLayout(layoutPreset, customRows, customColumns, cells);

  useEffect(() => {
    if (!placementConfirmed || address.trim().length < 2) return;

    let cancelled = false;
    setSuggesting(true);

    void fetch(`/api/lockers/suggest?address=${encodeURIComponent(address)}`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled || !result.success) return;
        setCode(result.data.code);
        if (!nameTouched) {
          setName(result.data.name);
        }
      })
      .finally(() => {
        if (!cancelled) setSuggesting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, placementConfirmed, nameTouched]);

  const canCreate = placementConfirmed && code.trim() && name.trim() && address.trim();

  const previewCard = useMemo(
    () => ({
      code,
      name: name || '—',
      address: address || '—',
      capacity: layout.cells.length,
      statusLabel: status === 'active' ? 'ACTIF' : 'INACTIF',
    }),
    [address, code, layout.cells.length, name, status],
  );

  function handlePresetChange(preset: LockerLayoutPreset) {
    setLayoutPreset(preset);
    if (preset === '3x3') {
      setCustomRows(3);
      setCustomColumns(3);
      setRowsInput('3');
      setColumnsInput('3');
      return;
    }
    if (preset === '4x4') {
      setCustomRows(4);
      setCustomColumns(4);
      setRowsInput('4');
      setColumnsInput('4');
    }
  }

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

  return (
    <div>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
        3. CONFIGURER LE CASIER
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
        L’emplacement final est celui du repère sur la carte.
      </p>

      <label style={{ display: 'block', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CODE CASIER</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={suggesting ? 'Génération…' : 'KOL-014'}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NOM</span>
        <input
          value={name}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          placeholder="Kolwezi Centre"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ADRESSE</span>
        <input value={address} onChange={(e) => onAddressChange(e.target.value)} style={inputStyle} />
      </label>

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>MODÈLE DE GRILLE</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '0.75rem' }}>
        {(Object.keys(LAYOUT_PRESET_LABELS) as LockerLayoutPreset[]).map((preset) => {
          const selected = layoutPreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetChange(preset)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: radius.button,
                border: `1px solid ${selected ? colors.primary : colors.border}`,
                background: selected ? '#E8FCE8' : colors.surface,
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: colors.secondary,
              }}
            >
              {LAYOUT_PRESET_LABELS[preset]}
            </button>
          );
        })}
      </div>

      {layoutPreset === 'custom' ? (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '0.85rem',
          }}
        >
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
      ) : null}

      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          border: `2px solid ${colors.border}`,
          borderRadius: radius.card,
          background: colors.background,
        }}
      >
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
                padding: '0.35rem 0.65rem',
                borderRadius: radius.button,
                border: `2px solid ${colors.border}`,
                background: colors.surface,
                fontWeight: 600,
                fontSize: '0.6875rem',
                cursor: 'pointer',
                color: colors.secondary,
              }}
            >
              {COMPARTMENT_SIZE_FULL_LABELS[size]}
            </button>
          ))}
        </div>
        <LockerLayoutPreview
          layout={layout}
          interactive
          onCellClick={handleCellClick}
        />
      </div>

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>STATUT À LA CRÉATION</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
        {(
          [
            { value: 'active' as const, label: 'ACTIF' },
            { value: 'offline' as const, label: 'INACTIF' },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="locker-create-status"
              checked={status === option.value}
              onChange={() => setStatus(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          border: `2px solid ${colors.primary}`,
          borderRadius: radius.card,
          background: colors.surface,
        }}
      >
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          APERÇU DU CASIER
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Code :</strong> {previewCard.code || '—'}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Nom :</strong> {previewCard.name}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Lieu :</strong> {previewCard.address}
        </p>
        <p style={{ margin: '0 0 12px', fontSize: '0.8125rem' }}>
          <strong>Capacité :</strong> {previewCard.capacity} compartiments — {previewCard.statusLabel}
        </p>
        <LockerLayoutPreview layout={layout} compact />
      </div>

      <button
        type="button"
        disabled={saving || !canCreate}
        onClick={() =>
          onCreate({
            ...(code.trim() ? { code: code.trim() } : {}),
            name: name.trim(),
            address: address.trim(),
            rows: layout.rows,
            columns: layout.columns,
            compartments: layout.cells,
            status,
          })
        }
        style={{
          width: '100%',
          height: spacing.buttonHeight,
          background: colors.primary,
          color: colors.secondary,
          border: 'none',
          borderRadius: radius.button,
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
          opacity: canCreate ? 1 : 0.55,
        }}
      >
        {saving ? 'CRÉATION…' : 'CRÉER LE CASIER'}
      </button>
    </div>
  );
}
