'use client';

import {
  documentViewPath,
  identityDocumentFileName,
  isImageDocumentPath,
  MAX_DRIVER_VEHICLE_DOCUMENTS,
} from '@eveider/api-contracts';
import { colors, radius, spacing, typography } from '@eveider/config-ui';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DropdownMenu,
  IconFile,
  IconPlus,
  Modal,
} from '@eveider/ui';
import { Download, Printer, Share2 } from 'lucide-react';
import { useRef, useState } from 'react';

type VehicleDocument = {
  id: string;
  storedRef: string;
  fileName: string;
};

type GalleryItem = {
  id: string;
  kind: 'identity' | 'vehicle';
  storedRef: string;
  fileName: string;
  label: string;
};

type IdentityDocumentPanelProps = {
  storedRef: string;
  ownerName: string;
  vehicleDocuments: VehicleDocument[];
  onUploadVehicle: (files: File[]) => Promise<void>;
  onRemoveVehicle: (documentId: string) => Promise<void>;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

export function IdentityDocumentPanel({
  storedRef,
  ownerName,
  vehicleDocuments,
  onUploadVehicle,
  onRemoveVehicle,
  onError,
  onSuccess,
}: IdentityDocumentPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'download' | 'print' | 'share' | 'upload' | 'remove' | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [printItem, setPrintItem] = useState<GalleryItem | null>(null);
  const [pendingRemove, setPendingRemove] = useState<GalleryItem | null>(null);

  const identityItem: GalleryItem = {
    id: 'identity',
    kind: 'identity',
    storedRef,
    fileName: identityDocumentFileName(storedRef, ownerName),
    label: 'Pièce d’identité',
  };
  const vehicleItems: GalleryItem[] = vehicleDocuments.map((doc) => ({
    id: doc.id,
    kind: 'vehicle',
    storedRef: doc.storedRef,
    fileName: doc.fileName,
    label: 'Document véhicule',
  }));
  const items = [identityItem, ...vehicleItems];
  const canAddVehicle = vehicleItems.length < MAX_DRIVER_VEHICLE_DOCUMENTS;

  function hrefFor(item: GalleryItem) {
    return documentViewPath(item.storedRef);
  }

  function isImage(item: GalleryItem) {
    return isImageDocumentPath(item.storedRef, item.fileName);
  }

  async function loadFile(item: GalleryItem) {
    const href = hrefFor(item);
    const response = await fetch(href);
    if (!response.ok || (response.headers.get('content-type') ?? '').includes('application/json')) {
      throw new Error('Impossible de charger le fichier');
    }
    const blob = await response.blob();
    return new File([blob], item.fileName, {
      type: blob.type || (isImage(item) ? 'image/jpeg' : 'application/pdf'),
    });
  }

  async function handleDownload(item: GalleryItem) {
    setBusy('download');
    try {
      const file = await loadFile(item);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.fileName;
      link.click();
      URL.revokeObjectURL(url);
      onSuccess?.(item.kind === 'identity' ? 'Pièce téléchargée.' : 'Document téléchargé.');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Téléchargement impossible');
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint(item: GalleryItem) {
    setBusy('print');
    setPrintItem(item);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      if (isImage(item)) {
        window.print();
        return;
      }
      const frame = iframeRef.current;
      if (frame?.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      }
      window.open(hrefFor(item), '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(null);
    }
  }

  async function handleShare(item: GalleryItem) {
    setBusy('share');
    try {
      const file = await loadFile(item);
      const payload = {
        files: [file],
        title: `${item.label} — ${ownerName}`,
        text: `${item.label} de ${ownerName}`,
      };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share(payload);
        onSuccess?.('Fichier partagé.');
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: window.location.href,
        });
        onSuccess?.('Lien partagé.');
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      onSuccess?.('Lien de la page copié.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onError?.(err instanceof Error ? err.message : 'Partage impossible');
    } finally {
      setBusy(null);
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    setBusy('upload');
    try {
      await onUploadVehicle(files);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Impossible d’ajouter le document');
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function confirmRemove() {
    if (!pendingRemove || pendingRemove.kind !== 'vehicle') return;
    setBusy('remove');
    try {
      await onRemoveVehicle(pendingRemove.id);
      if (previewItem?.id === pendingRemove.id) setPreviewItem(null);
      setPendingRemove(null);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Impossible de retirer le document');
    } finally {
      setBusy(null);
    }
  }

  const actionsBusy = busy !== null;
  const preview = previewItem ?? identityItem;
  const printed = printItem ?? identityItem;

  function renderMedia(item: GalleryItem, options?: { iframeRef?: boolean; alt?: string }) {
    if (isImage(item)) {
      return <img src={hrefFor(item)} alt={options?.alt ?? ''} />;
    }
    return (
      <iframe
        ref={options?.iframeRef ? iframeRef : undefined}
        title={options?.alt ?? item.label}
        src={hrefFor(item)}
        tabIndex={options?.iframeRef ? -1 : undefined}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Documents"
        description="La pièce d’identité est obligatoire. Les documents véhicule (carte grise, assurance…) sont facultatifs."
      />

      <ul className="driver-docs-gallery">
        {items.map((item) => (
          <li key={item.id} className="driver-docs-tile">
            <button
              type="button"
              className="driver-docs-tile__open"
              onClick={() => setPreviewItem(item)}
            >
              <span className="driver-docs-tile__thumb">
                {isImage(item) ? (
                  <img src={hrefFor(item)} alt="" />
                ) : (
                  <IconFile width={28} height={28} aria-hidden />
                )}
              </span>
              <span className="driver-docs-tile__meta">
                <span className="driver-docs-tile__label">{item.label}</span>
                <span className="driver-docs-tile__name">{item.fileName}</span>
              </span>
            </button>
            <div className="driver-docs-tile__menu">
              <DropdownMenu
                label={`Actions — ${item.label}`}
                tooltip={false}
                items={[
                  { id: 'open', label: 'Ouvrir', onClick: () => setPreviewItem(item) },
                  {
                    id: 'download',
                    label: 'Télécharger',
                    onClick: () => void handleDownload(item),
                    disabled: actionsBusy,
                  },
                  {
                    id: 'print',
                    label: 'Imprimer',
                    onClick: () => void handlePrint(item),
                    disabled: actionsBusy,
                  },
                  {
                    id: 'share',
                    label: 'Partager',
                    onClick: () => void handleShare(item),
                    disabled: actionsBusy,
                  },
                  ...(item.kind === 'vehicle'
                    ? [
                        {
                          id: 'remove',
                          label: 'Retirer',
                          tone: 'danger' as const,
                          onClick: () => setPendingRemove(item),
                          disabled: actionsBusy,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </li>
        ))}

        {canAddVehicle ? (
          <li className="driver-docs-tile driver-docs-tile--add">
            <button
              type="button"
              className="driver-docs-tile__open"
              disabled={actionsBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="driver-docs-tile__thumb driver-docs-tile__thumb--add">
                <IconPlus width={22} height={22} aria-hidden />
              </span>
              <span className="driver-docs-tile__meta">
                <span className="driver-docs-tile__label">Document véhicule</span>
                <span className="driver-docs-tile__name">
                  {busy === 'upload' ? 'Envoi…' : 'Ajouter (facultatif)'}
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              className="driver-docs-tile__input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              disabled={actionsBusy}
              aria-label="Ajouter un document véhicule"
              onChange={(event) => void handleUpload(event.target.files)}
            />
          </li>
        ) : null}
      </ul>

      <Modal
        open={previewItem != null}
        onClose={() => setPreviewItem(null)}
        title={preview.label}
        description={preview.fileName}
        maxWidth="min(720px, 96vw)"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={actionsBusy}
              loading={busy === 'download'}
              leadingIcon={<Download size={14} />}
              onClick={() => void handleDownload(preview)}
            >
              Télécharger
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={actionsBusy}
              loading={busy === 'print'}
              leadingIcon={<Printer size={14} />}
              onClick={() => void handlePrint(preview)}
            >
              Imprimer
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={actionsBusy}
              loading={busy === 'share'}
              leadingIcon={<Share2 size={14} />}
              onClick={() => void handleShare(preview)}
            >
              Partager
            </Button>
          </>
        }
      >
        <div className="driver-docs-preview">
          {renderMedia(preview, { alt: `${preview.label} de ${ownerName}` })}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingRemove != null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
        title="Retirer ce document ?"
        description={pendingRemove ? pendingRemove.fileName : undefined}
        confirmLabel="Retirer"
        tone="danger"
        loading={busy === 'remove'}
      />

      <div id="driver-identity-document" className="driver-identity-document--print" aria-hidden>
        <p className="driver-identity-document__print-title">
          {printed.label} — {ownerName}
        </p>
        <div className="driver-identity-document__frame">
          {renderMedia(printed, {
            iframeRef: true,
            alt: `${printed.label} de ${ownerName}`,
          })}
        </div>
      </div>

      <style>{`
        .driver-docs-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(10.5rem, 11.25rem));
          gap: ${spacing[3]}px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .driver-docs-tile {
          position: relative;
          min-width: 0;
          border: 1px solid ${colors.borderSubtle};
          border-radius: ${radius.md}px;
          background: ${colors.surface};
          overflow: hidden;
        }
        .driver-docs-tile:hover {
          border-color: ${colors.borderHover};
          background: ${colors.surfaceHover};
        }
        .driver-docs-tile:focus-within {
          border-color: ${colors.primary};
          box-shadow: var(--shadow-focus);
        }
        .driver-docs-tile--add {
          border-style: dashed;
        }
        .driver-docs-tile__open {
          display: flex;
          flex-direction: column;
          width: 100%;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .driver-docs-tile__open:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        .driver-docs-tile__thumb {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 7.25rem;
          padding: ${spacing[2]}px;
          background: ${colors.surfaceSubtle};
          color: ${colors.textMuted};
        }
        .driver-docs-tile__thumb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .driver-docs-tile__thumb--add {
          background: transparent;
        }
        .driver-docs-tile__meta {
          display: grid;
          gap: 2px;
          padding: ${spacing[2]}px ${spacing[3]}px ${spacing[3]}px;
          padding-right: ${spacing[8]}px;
        }
        .driver-docs-tile--add .driver-docs-tile__meta {
          padding-right: ${spacing[3]}px;
        }
        .driver-docs-tile__label {
          font-size: ${typography.caption.fontSize};
          font-weight: ${typography.weights.semibold};
          line-height: ${typography.caption.lineHeight};
          color: ${colors.secondary};
        }
        .driver-docs-tile__name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: ${typography.caption.fontSize};
          line-height: ${typography.caption.lineHeight};
          color: ${colors.textMuted};
        }
        .driver-docs-tile__menu {
          position: absolute;
          top: ${spacing[2]}px;
          right: ${spacing[2]}px;
        }
        .driver-docs-tile__menu .nb-dropdown__trigger[data-tooltip]::after {
          content: none !important;
          display: none !important;
        }
        .driver-docs-tile__input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .driver-docs-preview {
          overflow: auto;
          border: 1px solid ${colors.borderSubtle};
          border-radius: ${radius.md}px;
          background: ${colors.surfaceSubtle};
        }
        .driver-docs-preview img {
          display: block;
          width: 100%;
          height: auto;
          max-height: min(56vh, 520px);
          object-fit: contain;
          margin: 0 auto;
          background: ${colors.surface};
        }
        .driver-docs-preview iframe {
          display: block;
          width: 100%;
          height: min(56vh, 520px);
          border: none;
          background: #ffffff;
        }
        .driver-identity-document--print {
          position: absolute;
          left: -12000px;
          top: 0;
          width: 800px;
          height: 600px;
          overflow: hidden;
          pointer-events: none;
        }
        .driver-identity-document__print-title {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #driver-identity-document,
          #driver-identity-document * {
            visibility: visible !important;
          }
          #driver-identity-document {
            position: absolute;
            inset: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            overflow: visible;
            clip: auto;
            white-space: normal;
            background: #ffffff;
          }
          .no-print,
          .nb-modal-root {
            display: none !important;
          }
          .driver-identity-document__print-title {
            display: block;
            margin: 0 0 12px;
            font-size: 16px;
            font-weight: 700;
            color: #111;
          }
          .driver-identity-document__frame {
            border: none;
            background: #ffffff;
          }
          .driver-identity-document__frame img,
          .driver-identity-document__frame iframe {
            max-height: none;
            height: auto;
            width: 100%;
          }
        }
      `}</style>
    </Card>
  );
}
