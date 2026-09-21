export function formatFileSize(bytes: number): string {
  const kiloBytes = bytes / 1024;
  if (kiloBytes >= 1024) {
    const megaBytes = kiloBytes / 1024;
    const label = Number.isInteger(megaBytes)
      ? String(megaBytes)
      : megaBytes.toFixed(1).replace('.', ',');
    return `${label} Mo`;
  }
  return `${Math.max(1, Math.round(kiloBytes))} Ko`;
}

export function formatFileFieldSelection(file: { name: string; size: number } | null): string {
  if (!file) return 'Aucun fichier choisi';
  return `${file.name} · ${formatFileSize(file.size)}`;
}

export function isImageFile(file: { type: string; name: string }): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

export function fileMatchesAccept(
  file: { type: string; name: string },
  accept?: string,
): boolean {
  if (!accept?.trim()) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => {
      if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
      if (token.startsWith('.')) return name.endsWith(token);
      return type === token;
    });
}

export function rejectDroppedFile(
  file: { name: string; type: string; size: number } | null | undefined,
  options: { accept?: string; maxSizeBytes?: number } = {},
): string | null {
  if (!file) return 'Ajoutez un fichier.';
  if (!fileMatchesAccept(file, options.accept)) {
    return 'Format non accepté';
  }
  if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
    return `Fichier trop volumineux (${formatFileSize(options.maxSizeBytes)} max)`;
  }
  return null;
}
