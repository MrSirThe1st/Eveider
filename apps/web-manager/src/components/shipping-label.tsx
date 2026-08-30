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
};

export function ShippingLabel({ data }: ShippingLabelProps) {
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
      </div>

      <div
        id="eveider-shipping-label"
        style={{
          border: borderSubtle(),
          borderRadius: radius.button,
          padding: '1.25rem',
          background: colors.surface,
          maxWidth: 420,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 800,
                letterSpacing: '0.14em',
                fontSize: '0.75rem',
              }}
            >
              EVEIDER
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
              Étiquette du colis
            </p>
          </div>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR ${data.trackingNumber}`} width={96} height={96} />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                background: colors.background,
                border: borderSubtle(),
              }}
            />
          )}
        </div>

        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {data.trackingNumber}
        </p>

        <dl style={{ margin: 0, display: 'grid', gap: '0.65rem', fontSize: '0.8125rem' }}>
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
            <dt style={{ fontWeight: 700, opacity: 0.65 }}>Point Eveider</dt>
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
            <dt style={{ fontWeight: 700, opacity: 0.65 }}>Enlèvement / paiement</dt>
            <dd style={{ margin: '0.15rem 0 0' }}>
              {data.pickupTypeLabel} · {data.paymentResponsibilityLabel}
            </dd>
          </div>
          {data.reference ? (
            <div>
              <dt style={{ fontWeight: 700, opacity: 0.65 }}>Réf. marchande</dt>
              <dd style={{ margin: '0.15rem 0 0' }}>{data.reference}</dd>
            </div>
          ) : null}
        </dl>
      </div>

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
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
