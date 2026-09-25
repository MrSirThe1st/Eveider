'use client';

import { colors, borderSubtle, radius } from '@eveider/config-ui';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export type ShippingLabelData = {
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  recipientName: string | null;
  recipientPhone: string;
  lockerName: string | null;
  lockerAddress: string | null;
  compartmentLabel: string | null;
  packageSizeLabel: string;
  packageCategoryLabel: string;
  paymentResponsibilityLabel: string;
  pickupTypeLabel: string;
  reference: string | null;
};

type ShippingLabelProps = {
  data: ShippingLabelData;
  /** Compact preview for parcel detail; full is the default printable card. */
  variant?: 'compact' | 'full';
  /** Hide Imprimer / Télécharger (e.g. when parent owns actions). */
  hideActions?: boolean;
  /** Shown in compact mode to open a larger preview. */
  onExpand?: () => void;
  /** Assign #eveider-shipping-label for print. Default true for full, false for compact preview. */
  printable?: boolean;
};

function LabelBody({
  data,
  qrDataUrl,
  compact,
  printable,
}: {
  data: ShippingLabelData;
  qrDataUrl: string | null;
  compact: boolean;
  printable: boolean;
}) {
  const qrSize = compact ? 64 : 96;
  return (
    <div
      id={printable ? 'eveider-shipping-label' : undefined}
      style={{
        border: borderSubtle(),
        borderRadius: radius.button,
        padding: compact ? '0.85rem' : '1.25rem',
        background: colors.surface,
        maxWidth: compact ? 280 : 420,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          alignItems: 'flex-start',
          marginBottom: compact ? '0.65rem' : '1rem',
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              letterSpacing: '0.14em',
              fontSize: compact ? '0.65rem' : '0.75rem',
            }}
          >
            EVEIDER
          </p>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: compact ? '0.65rem' : '0.75rem',
              color: colors.textMuted,
            }}
          >
            Étiquette du colis
          </p>
        </div>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR ${data.trackingNumber}`}
            width={qrSize}
            height={qrSize}
          />
        ) : (
          <div
            style={{
              width: qrSize,
              height: qrSize,
              background: colors.background,
              border: borderSubtle(),
            }}
          />
        )}
      </div>

      <p
        style={{
          margin: compact ? '0 0 0.65rem' : '0 0 1rem',
          fontSize: compact ? '0.95rem' : '1.25rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      >
        {data.trackingNumber}
      </p>

      <dl
        style={{
          margin: 0,
          display: 'grid',
          gap: compact ? '0.4rem' : '0.65rem',
          fontSize: compact ? '0.7rem' : '0.8125rem',
        }}
      >
        <div>
          <dt style={{ fontWeight: 700, opacity: 0.65 }}>Expéditeur</dt>
          <dd style={{ margin: '0.15rem 0 0' }}>
            {data.senderName} · {data.senderPhone}
            {data.senderAddress ? (
              <>
                <br />
                {data.senderAddress}
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 700, opacity: 0.65 }}>Destinataire</dt>
          <dd style={{ margin: '0.15rem 0 0' }}>
            {data.recipientName ?? '—'} · {data.recipientPhone}
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 700, opacity: 0.65 }}>Casier Eveider</dt>
          <dd style={{ margin: '0.15rem 0 0' }}>
            {data.lockerName ?? '—'}
            {data.lockerAddress ? (
              <>
                <br />
                {data.lockerAddress}
              </>
            ) : null}
            {data.compartmentLabel ? (
              <>
                <br />
                Comp. {data.compartmentLabel}
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 700, opacity: 0.65 }}>Colis</dt>
          <dd style={{ margin: '0.15rem 0 0' }}>
            {data.packageSizeLabel} · {data.packageCategoryLabel}
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 700, opacity: 0.65 }}>Méthode</dt>
          <dd style={{ margin: '0.15rem 0 0' }}>{data.pickupTypeLabel}</dd>
        </div>
        {data.reference ? (
          <div>
            <dt style={{ fontWeight: 700, opacity: 0.65 }}>Réf. marchande</dt>
            <dd style={{ margin: '0.15rem 0 0' }}>{data.reference}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function ShippingLabel({
  data,
  variant = 'full',
  hideActions = false,
  onExpand,
  printable,
}: ShippingLabelProps) {
  const isCompact = variant === 'compact';
  const isPrintable = printable ?? !isCompact;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(data.trackingNumber, {
      margin: 1,
      width: 180,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [data.trackingNumber]);

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {!hideActions ? (
        <div
          className="no-print"
          style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={handlePrint}
            className="nb-btn nb-btn-primary"
            style={{ height: 42 }}
          >
            Imprimer l’étiquette
          </button>
          {qrDataUrl ? (
            <a
              href={qrDataUrl}
              download={`${data.trackingNumber}-qr.png`}
              className="nb-btn nb-btn-secondary"
              style={{ height: 42, display: 'inline-flex', alignItems: 'center' }}
            >
              Télécharger QR (PNG)
            </a>
          ) : null}
          {isCompact && onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              className="nb-btn nb-btn-secondary"
              style={{ height: 42 }}
            >
              Agrandir
            </button>
          ) : null}
        </div>
      ) : null}

      {isCompact ? (
        <>
          <div
            className="no-print"
            style={{
              maxHeight: 168,
              overflow: 'hidden',
              borderRadius: radius.button,
              border: borderSubtle(),
              background: colors.surfaceSubtle,
              padding: '0.65rem',
            }}
          >
            <LabelBody data={data} qrDataUrl={qrDataUrl} compact printable={false} />
          </div>
          <div
            aria-hidden
            style={{ position: 'absolute', left: -9999, top: 0, width: 420 }}
          >
            <LabelBody data={data} qrDataUrl={qrDataUrl} compact={false} printable />
          </div>
        </>
      ) : (
        <LabelBody data={data} qrDataUrl={qrDataUrl} compact={false} printable={isPrintable} />
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #eveider-shipping-label,
          #eveider-shipping-label * {
            visibility: visible !important;
          }
          #eveider-shipping-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100mm;
            border: 1px solid #111 !important;
            border-radius: 0 !important;
            max-width: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
