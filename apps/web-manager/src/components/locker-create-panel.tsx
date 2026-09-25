'use client';

import { colors, radius, spacing, webCardStyle, webInputStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  LOCKER_TYPE_LABELS,
  cycleCompartmentSize,
  resizeLayoutCells,
  resolveLockerLayout,
  usesCompartmentGrid,
  type CompartmentCell,
  type CompartmentSize,
  type CommissionType,
  type LockerLayoutPreset,
  type LockerType,
} from '@eveider/domain';
import { Button } from '@eveider/ui';
import { useEffect, useState } from 'react';
import {
  LAYOUT_PRESET_LABELS,
  LockerLayoutPreview,
  useLockerLayout,
} from '@/components/locker-layout-preview';
import { fetchJson } from '@/lib/api/fetch-json';
import type { CityOptionDto } from '@/lib/city-presenter';
import { formatZoneCoverageLabel, suggestCityFromAddress, zonesForCity } from '@/lib/geography-presentation';
import type { LockerLayoutTemplateDto } from '@/server/locker-settings';

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
  serviceAreaId?: string | null;
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

type ServiceAreaOption = {
  id: string;
  label: string;
  city: string;
  cityId: string;
  code: string;
  name: string;
};

type LockerCreatePanelProps = {
  address: string;
  onAddressChange: (value: string) => void;
  /** When true, address is set via AddressMapPicker above — show read-only. */
  addressReadOnly?: boolean;
  placementConfirmed: boolean;
  latitude?: number | null;
  longitude?: number | null;
  saving: boolean;
  cities?: CityOptionDto[];
  serviceAreas?: ServiceAreaOption[];
  onCreate: (input: CreatePointPayload) => void;
};

type CreateStatus = 'active' | 'offline';
type LayoutSource = 'manual' | 'template';

const BULK_SIZES: CompartmentSize[] = ['small', 'medium', 'large'];
const NETWORK_TYPE: LockerType = 'SMART_LOCKER';

export function LockerCreatePanel({
  address,
  onAddressChange,
  addressReadOnly = false,
  placementConfirmed,
  latitude = null,
  longitude = null,
  saving,
  cities = [],
  serviceAreas = [],
  onCreate,
}: LockerCreatePanelProps) {
  const type = NETWORK_TYPE;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [layoutSource, setLayoutSource] = useState<LayoutSource>('manual');
  const [layoutPreset, setLayoutPreset] = useState<LockerLayoutPreset>('3x3');
  const [customRows, setCustomRows] = useState(3);
  const [customColumns, setCustomColumns] = useState(3);
  const [rowsInput, setRowsInput] = useState('3');
  const [columnsInput, setColumnsInput] = useState('3');
  const [cells, setCells] = useState<CompartmentCell[]>(() => resolveLockerLayout('3x3').cells);
  const [templates, setTemplates] = useState<LockerLayoutTemplateDto[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [status, setStatus] = useState<CreateStatus>('active');
  const [cityId, setCityId] = useState('');
  const [cityTouched, setCityTouched] = useState(false);
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (layoutSource !== 'manual') return;
    if (layoutPreset === '3x3') {
      setCells(resolveLockerLayout('3x3').cells);
      return;
    }
    if (layoutPreset === '4x4') {
      setCells(resolveLockerLayout('4x4').cells);
      return;
    }
    setCells((previous) => resizeLayoutCells(customRows, customColumns, previous));
  }, [layoutSource, layoutPreset, customRows, customColumns]);

  useEffect(() => {
    if (layoutSource !== 'template') return;
    let cancelled = false;
    setTemplatesLoading(true);
    void fetchJson<{ templates: LockerLayoutTemplateDto[] }>('/api/locker-templates')
      .then((data) => {
        if (cancelled) return;
        setTemplates(data.templates);
        const first = data.templates[0];
        if (first) {
          setSelectedTemplateId(first.id);
          setCustomRows(first.rows);
          setCustomColumns(first.columns);
          setRowsInput(String(first.rows));
          setColumnsInput(String(first.columns));
          setCells(first.cells);
          setLayoutPreset('custom');
        }
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [layoutSource]);

  const layout = useLockerLayout(
    layoutSource === 'template' ? 'custom' : layoutPreset,
    customRows,
    customColumns,
    cells,
  );
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

  useEffect(() => {
    if (cityTouched) return;
    const suggested = suggestCityFromAddress(address, cities);
    if (suggested && suggested !== cityId) {
      setCityId(suggested);
      setServiceAreaId('');
    }
  }, [address, cities, cityTouched, cityId]);

  const zonesInCity = zonesForCity(serviceAreas, cityId);
  const selectedCity = cities.find((city) => city.id === cityId) ?? null;
  const selectedZone = serviceAreas.find((area) => area.id === serviceAreaId) ?? null;

  const capacityOk = layoutSource === 'template' ? Boolean(selectedTemplateId) : true;

  const canCreate =
    placementConfirmed &&
    code.trim() &&
    name.trim() &&
    address.trim() &&
    Boolean(serviceAreaId) &&
    capacityOk;

  const previewCapacity = `${layout.cells.length} compartiments`;

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  function applyTemplate(template: LockerLayoutTemplateDto) {
    setSelectedTemplateId(template.id);
    setCustomRows(template.rows);
    setCustomColumns(template.columns);
    setRowsInput(String(template.rows));
    setColumnsInput(String(template.columns));
    setCells(template.cells);
    setLayoutPreset('custom');
  }

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
    if (layoutSource === 'template') return;
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
      serviceAreaId,
    };

    payload.rows = layout.rows;
    payload.columns = layout.columns;
    payload.compartments = layout.cells;

    onCreate(payload);
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          LOCALISATION
        </p>
        <label style={{ display: 'block', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ADRESSE</span>
          <input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            style={inputStyle}
            readOnly={addressReadOnly}
            aria-readonly={addressReadOnly}
          />
          {addressReadOnly ? (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
              Modifiez l’adresse via la recherche sur la carte ci-dessus.
            </p>
          ) : null}
        </label>
        {latitude != null && longitude != null ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
            Placez un repère sur la carte. Le clic carte ne crée pas le casier.
          </p>
        )}
      </section>

      <section>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          GÉOGRAPHIE
        </p>
        <label style={{ display: 'block', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>VILLE</span>
          <select
            value={cityId}
            aria-label="Ville"
            onChange={(e) => {
              setCityTouched(true);
              setCityId(e.target.value);
              setServiceAreaId('');
            }}
            style={inputStyle}
          >
            <option value="">Choisir une ville</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ZONE</span>
          <select
            value={serviceAreaId}
            aria-label="Zone"
            disabled={!cityId}
            onChange={(e) => setServiceAreaId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{cityId ? 'Choisir une zone' : 'Choisissez d’abord une ville'}</option>
            {zonesInCity.map((area) => (
              <option key={area.id} value={area.id}>
                {formatZoneCoverageLabel(area)}
              </option>
            ))}
          </select>
        </label>
        <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted }}>
          L’adresse peut suggérer une ville. La zone n’est jamais choisie automatiquement.
        </p>
      </section>

      <section>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          CASIER
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
          Casier intelligent uniquement. L’emplacement final est celui du repère sur la carte.
        </p>

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
          placeholder="Kolwezi Centre"
          style={inputStyle}
        />
      </label>
      </section>

      <section>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          CONFIGURATION
        </p>

      {smartLocker ? (
        <>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>SOURCE DE GRILLE</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '0.75rem' }}>
            {(
              [
                { value: 'manual' as const, label: 'Manuel' },
                { value: 'template' as const, label: 'Créer depuis un modèle' },
              ] as const
            ).map((option) => {
              const selected = layoutSource === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLayoutSource(option.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: radius.button,
                    border: `1px solid ${selected ? colors.primary : colors.border}`,
                    background: selected ? colors.successMuted : colors.surface,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: selected ? colors.successFg : colors.secondary,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {layoutSource === 'template' ? (
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>MODÈLE</span>
              <select
                value={selectedTemplateId}
                disabled={templatesLoading || templates.length === 0}
                onChange={(e) => {
                  const template = templates.find((item) => item.id === e.target.value);
                  if (template) applyTemplate(template);
                }}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                {templatesLoading ? <option value="">Chargement…</option> : null}
                {!templatesLoading && templates.length === 0 ? (
                  <option value="">Aucun modèle — créez-en dans Paramètres</option>
                ) : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.rows}×{template.columns})
                  </option>
                ))}
              </select>
              {selectedTemplate ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
                  {selectedTemplate.capacity} compartiments — copie figée à la création
                </p>
              ) : null}
            </label>
          ) : (
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
                        background: selected ? colors.successMuted : colors.surface,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: selected ? colors.successFg : colors.secondary,
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
            </>
          )}

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
              {layoutSource === 'template'
                ? 'Aperçu du modèle sélectionné (non modifiable ici).'
                : 'Cliquez sur un compartiment pour faire défiler S → M → L.'}
            </p>
            {layoutSource === 'manual' ? (
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
            ) : null}
            <LockerLayoutPreview
              layout={layout}
              interactive={layoutSource === 'manual'}
              onCellClick={handleCellClick}
            />
          </div>
        </>
      ) : null}

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>STATUT À LA CRÉATION</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
        {(
          [
            { value: 'active' as const, label: 'Actif' },
            { value: 'offline' as const, label: 'Inactif' },
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
      </section>

      <section>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          RÉCAPITULATIF
        </p>
      <div style={{ ...webCardStyle, marginBottom: '1rem', padding: '1rem' }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Lieu :</strong> {address || '—'}
          {latitude != null && longitude != null
            ? ` (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
            : ''}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Ville :</strong> {selectedCity?.name ?? '—'}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
          <strong>Zone :</strong>{' '}
          {selectedZone ? formatZoneCoverageLabel(selectedZone) : '—'}
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
        {smartLocker && layoutSource === 'template' ? (
          <p style={{ margin: '0 0 4px', fontSize: '0.8125rem' }}>
            <strong>Modèle :</strong> {selectedTemplate?.name ?? '—'}
          </p>
        ) : null}
        <p style={{ margin: '0 0 12px', fontSize: '0.8125rem' }}>
          <strong>Compartiments :</strong> {previewCapacity} — {status === 'active' ? 'Actif' : 'Inactif'}
        </p>
        {smartLocker ? <LockerLayoutPreview layout={layout} compact /> : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        loading={saving}
        disabled={!canCreate}
        onClick={submit}
        style={{ width: '100%', height: spacing.buttonHeight, fontWeight: 700 }}
      >
        Créer le casier
      </Button>
      </section>
    </div>
  );
}
