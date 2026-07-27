'use client';

import { colors, spacing, typography } from '@eveider/config-ui';
import { Button, Modal } from '@eveider/ui';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from './kyc-review-constants';

type PreviewDocument = {
  id: string;
  type: string;
  fileUrl: string;
  fileName: string | null;
};

type KycDocumentPreviewProps = {
  document: PreviewDocument | null;
  open: boolean;
  onClose: () => void;
};

function isImageDocument(fileUrl: string, fileName: string | null): boolean {
  const target = `${fileName ?? ''} ${fileUrl}`.toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(target);
}

export function KycDocumentPreview({ document, open, onClose }: KycDocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (open) setZoom(1);
  }, [open, document?.id]);

  if (!document) return null;

  const title = DOCUMENT_TYPE_LABELS[document.type] ?? document.type.toUpperCase();
  const isImage = isImageDocument(document.fileUrl, document.fileName);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${document.fileName ?? 'document'} · aperçu uniquement (téléchargement désactivé)`}
      maxWidth="min(960px, 96vw)"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
          marginBottom: spacing[3],
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            aria-label="Zoom arrière"
            leadingIcon={<Minus size={14} />}
          >
            Zoom −
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            aria-label="Zoom avant"
            leadingIcon={<Plus size={14} />}
          >
            Zoom +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            aria-label="Réinitialiser le zoom"
            leadingIcon={<RotateCcw size={14} />}
          >
            Reset
          </Button>
        </div>
        <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div
        style={{
          height: 'min(62vh, 560px)',
          overflow: 'auto',
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 8,
          background: '#0F172A',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${100 / zoom}%`,
            minHeight: '100%',
          }}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin KYC remote URL preview
            <img
              src={document.fileUrl}
              alt={title}
              draggable={false}
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                margin: '0 auto',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <iframe
              title={title}
              src={`${document.fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              style={{
                width: '100%',
                height: 'min(62vh, 560px)',
                border: 'none',
                background: '#FFFFFF',
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
