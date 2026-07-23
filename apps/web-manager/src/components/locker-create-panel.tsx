'use client';

import { colors, radius, spacing, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  LOCKER_TYPE_LABELS,
  cycleCompartmentSize,
  resizeLayoutCells,
  resolveLockerLayout,
  usesCompartmentGrid,
  usesSoftCapacity,
  type CompartmentCell,
  type CompartmentSize,
  type CommissionType,
  type LockerLayoutPreset,
  type LockerType,
} from '@eveider/domain';
import { useEffect, useState } from 'react';
import {
  LAYOUT_PRESET_LABELS,
  LockerLayoutPreview,
  useLockerLayout,
} from '@/components/locker-layout-preview';

const inputStyle: React.CSSProperties = {
  ...webInputStyle,
  marginTop: '0.35rem',
  height: 42,
  padding: '0 10px',
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

export type CreatePointPayload = {
  type: LockerType;
  code?: string;
  name: string;
  address: string;
  status: 'active' | 'offline';
  rows?: number;
  columns?: number;
  compartments?: CompartmentCell[];
  maxCapacity?: number;
  contactPhone?: string;
  contactName?: string;
  notes?: string;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
};

type LockerCreatePanelProps = {
  address: string;
  onAddressChange: (value: string) => void;
  placementConfirmed: boolean;
  saving: boolean;
  onCreate: (input: CreatePointPayload) => void;
};

type CreateStatus = 'active' | 'offline';

const BULK_SIZES: CompartmentSize[] = ['small', 'medium', 'large'];
const POINT_TYPES: LockerType[] = ['SMART_LOCKER', 'PARTNER_POINT', 'RESIDENTIAL_LOCKER'];

export function LockerCreatePanel({
  address,
  onAddressChange,
  placementConfirmed,
  saving,
  onCreate,
}: LockerCreatePanelProps) {
  const [type, setType] = useState<LockerType>('SMART_LOCKER');
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
  const [maxCapacity, setMaxCapacity] = useState('20');
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [commissionType, setCommissionType] = useState<CommissionType | ''>('');
  const [commissionValue, setCommissionValue] = useState('');
  const [commissionCurrency, setCommissionCurrency] = useState('CDF');

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
  const softCapacity = usesSoftCapacity(type);
  const smartLocker = usesCompartmentGrid(type);

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

  const capacityOk = softCapacity
    ? Number.parseInt(maxCapacity, 10) >= 1 && contactPhone.trim().length >= 8
    : true;

  const canCreate =
    placementConfirmed && code.trim() && name.trim() && address.trim() && capacityOk;

  const previewCapacity = smartLocker
    ? `${layout.cells.length} compartiments`
    : `${maxCapacity || '—'} colis max`;

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

  function submit() {
    const payload: CreatePointPayload = {
      type,
      ...(code.trim() ? { code: code.trim() } : {}),
      name: name.trim(),
      address: address.trim(),
      status,
    };

    if (smartLocker) {
      payload.rows = layout.rows;
      payload.columns = layout.columns;
      payload.compartments = layout.cells;
    } else {
      payload.maxCapacity = Number.parseInt(maxCapacity, 10);
      payload.contactPhone = contactPhone.trim();
      if (contactName.trim()) payload.contactName = contactName.trim();
      if (notes.trim()) payload.notes = notes.trim();
      if (commissionType) {
        payload.commissionType = commissionType;
        const value = Number.parseFloat(commissionValue);
        payload.commissionValue = Number.isFinite(value) ? value : null;
        payload.commissionCurrency = commissionCurrency.trim().toUpperCase() || null;
      } else {
        payload.commissionType = null;
        payload.commissionValue = null;
        payload.commissionCurrency = null;
      }
    }

    onCreate(payload);
  }

  return (
    <div>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
        3. CONFIGURER LE POINT
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
        L’emplacement final est celui du repère sur la carte.
      </p>

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>TYPE DE POINT</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        {POINT_TYPES.map((pointType) => {
          const selected = type === pointType;
          return (
            <button
              key={pointType}
              type="button"
              onClick={() => setType(pointType)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: radius.button,
                border: `1px solid ${selected ? colors.primary : colors.border}`,
                background: selected ? '#E8FCE8' : colors.surface,
                fontWeight: 700,
                fontSize: '0.6875rem',
                cursor: 'pointer',
                color: colors.secondary,
              }}
            >
              {LOCKER_TYPE_LABELS[pointType]}
            </button>
          );
        })}
      </div>

      <label style={{ display: 'block', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CODE</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={suggesting ? 'Génération…' : 'EVPA7K3M2X'}
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
          placeholder={softCapacity ? 'Pharmacie XYZ' : 'Kolwezi Centre'}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ADRESSE</span>
        <input value={address} onChange={(e) => onAddressChange(e.target.value)} style={inputStyle} />
      </label>

      {smartLocker ? (
        <>
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
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.85rem' }}>
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
              ...webCardStyle,
              marginBottom: '1rem',
              padding: '1rem',
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
        </>
      ) : (
        <>
          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CAPACITÉ MAXIMALE (COLIS)</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value.replace(/\D/g, ''))}
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>TÉLÉPHONE DE CONTACT</span>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+243810000000"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NOM DU CONTACT</span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Optionnel"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NOTES / ACCÈS</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Horaires, instructions d’accès…"
              rows={3}
              style={{ ...inputStyle, height: 'auto', padding: '0.65rem 10px', resize: 'vertical' }}
            />
          </label>

          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
            COMMISSION (FUTUR)
          </p>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <select
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value as CommissionType | '')}
              style={inputStyle}
            >
              <option value="">Aucune pour l’instant</option>
              <option value="percent">Pourcentage</option>
              <option value="fixed">Montant fixe</option>
            </select>
            {commissionType ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder={commissionType === 'percent' ? '5' : '500'}
                  style={inputStyle}
                />
                <input
                  value={commissionCurrency}
                  onChange={(e) => setCommissionCurrency(e.target.value.toUpperCase())}
                  placeholder="CDF"
                  style={inputStyle}
                />
              </div>
            ) : null}
          </div>
        </>
      )}

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

      <div style={{ ...webCardStyle, marginBottom: '1rem', padding: '1rem' }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          APERÇU DU POINT
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Type :</strong> {LOCKER_TYPE_LABELS[type]}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Code :</strong> {code || '—'}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Nom :</strong> {name || '—'}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Lieu :</strong> {address || '—'}
        </p>
        <p style={{ margin: '0 0 12px', fontSize: '0.8125rem' }}>
          <strong>Capacité :</strong> {previewCapacity} — {status === 'active' ? 'ACTIF' : 'INACTIF'}
        </p>
        {smartLocker ? <LockerLayoutPreview layout={layout} compact /> : null}
      </div>

      <button
        type="button"
        disabled={saving || !canCreate}
        onClick={submit}
        style={{
          ...webSecondaryButtonStyle,
          width: '100%',
          height: spacing.buttonHeight,
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
          opacity: canCreate ? 1 : 0.55,
        }}
      >
        {saving ? 'CRÉATION…' : 'CRÉER LE POINT'}
      </button>
    </div>
  );
}
