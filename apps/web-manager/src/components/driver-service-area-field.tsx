'use client';

import { colors, radius, webInputStyle } from '@eveider/config-ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ServiceAreaOptionDto } from '@/lib/service-area-presenter';

type DriverServiceAreaFieldProps = {
  apiPath: string;
  serviceAreaId: string | null;
  serviceAreaName: string | null;
  serviceAreas: ServiceAreaOptionDto[];
  canEdit?: boolean;
};

export function DriverServiceAreaField({
  apiPath,
  serviceAreaId,
  serviceAreaName,
  serviceAreas,
  canEdit = true,
}: DriverServiceAreaFieldProps) {
  const router = useRouter();
  const [value, setValue] = useState(serviceAreaId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit || serviceAreas.length === 0) {
    return serviceAreaName ? (
      <>{serviceAreaName}</>
    ) : (
      <span style={{ color: colors.textMuted }}>—</span>
    );
  }

  return (
    <div>
      <select
        aria-label="Zone de service"
        value={value}
        disabled={saving}
        onChange={(event) => {
          const nextId = event.target.value || null;
          setValue(event.target.value);
          setSaving(true);
          setError(null);
          void (async () => {
            try {
              const response = await fetch(apiPath, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceAreaId: nextId }),
              });
              const result = await response.json();
              if (!result.success) {
                setError(result.error ?? 'Mise à jour échouée');
                setValue(serviceAreaId ?? '');
                return;
              }
              router.refresh();
            } catch {
              setError('Impossible de mettre à jour la zone.');
              setValue(serviceAreaId ?? '');
            } finally {
              setSaving(false);
            }
          })();
        }}
        style={{
          ...webInputStyle,
          display: 'block',
          width: '100%',
          maxWidth: 280,
          height: 40,
          padding: '0 10px',
          borderRadius: radius.button,
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.secondary,
          fontWeight: 600,
        }}
      >
        <option value="">Non assignée</option>
        {serviceAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.label}
          </option>
        ))}
      </select>
      {error ? (
        <p style={{ margin: '0.35rem 0 0', color: colors.danger, fontSize: '0.75rem' }}>{error}</p>
      ) : null}
    </div>
  );
}
