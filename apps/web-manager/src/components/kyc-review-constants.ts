export type CheckKey =
  | 'PHONE_VERIFIED'
  | 'IDENTITY_MATCHED'
  | 'DOCUMENT_VALID'
  | 'ADDRESS_CONFIRMED'
  | 'COMPANY_REGISTERED'
  | 'BANK_ACCOUNT_VERIFIED';

export type CheckStatusValue = 'PASS' | 'FAIL' | 'PENDING';

export const CHECK_ITEMS: Array<{ key: CheckKey; label: string }> = [
  { key: 'PHONE_VERIFIED', label: 'Téléphone vérifié (SMS OTP)' },
  { key: 'IDENTITY_MATCHED', label: 'Identité du propriétaire correspondante aux pièces' },
  { key: 'COMPANY_REGISTERED', label: 'Registre RCCM & NIF valides' },
  { key: 'DOCUMENT_VALID', label: 'Documents lisibles et non périmés' },
  { key: 'ADDRESS_CONFIRMED', label: "Adresse d'enlèvement / d'exploitation vérifiée" },
  { key: 'BANK_ACCOUNT_VERIFIED', label: 'Coordonnées de paiement COD valides' },
];

export const CHECK_FAIL_REASONS: Record<CheckKey, Array<{ code: string; label: string }>> = {
  PHONE_VERIFIED: [
    { code: 'not_verified', label: 'OTP non validé' },
    { code: 'wrong_number', label: 'Numéro incorrect ou inaccessible' },
  ],
  IDENTITY_MATCHED: [
    { code: 'name_mismatch', label: 'Nom différent entre ID et RCCM' },
    { code: 'photo_mismatch', label: 'Photo ne correspond pas au titulaire' },
    { code: 'id_expired', label: "Pièce d'identité expirée" },
  ],
  COMPANY_REGISTERED: [
    { code: 'rccm_invalid', label: 'RCCM invalide ou introuvable' },
    { code: 'nif_invalid', label: 'NIF invalide ou introuvable' },
    { code: 'name_mismatch_legal', label: 'Raison sociale ne correspond pas' },
  ],
  DOCUMENT_VALID: [
    { code: 'illegible', label: 'Document(s) illisible(s)' },
    { code: 'expired', label: 'Document(s) périmé(s)' },
    { code: 'incomplete', label: 'Dossier documentaire incomplet' },
  ],
  ADDRESS_CONFIRMED: [
    { code: 'address_unclear', label: 'Adresse illisible ou incomplète' },
    { code: 'address_mismatch', label: 'Adresse ne correspond pas aux documents' },
    { code: 'unreachable', label: "Point d'enlèvement inaccessible" },
  ],
  BANK_ACCOUNT_VERIFIED: [
    { code: 'invalid_account', label: 'Coordonnées de paiement invalides' },
    { code: 'name_mismatch_payout', label: 'Titulaire ne correspond pas' },
  ],
};

export const DOC_CORRECTION_REASONS = [
  { code: 'illegible', label: 'Document illisible' },
  { code: 'expired', label: 'Document périmé' },
  { code: 'wrong_document', label: 'Mauvais document fourni' },
  { code: 'incomplete', label: 'Document incomplet / coupé' },
  { code: 'low_quality', label: 'Qualité insuffisante (flou / ombre)' },
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  rccm_certificate: 'Certificat RCCM',
  nif_certificate: 'Certificat NIF',
  legal_rep_id: "Pièce d'identité du représentant",
  national_id: "Carte d'identité nationale",
  selfie: 'Selfie',
  business_license: 'Licence commerciale',
  proof_of_address: 'Justificatif de domicile',
};

export const REVIEW_STEPS = [
  { id: 1, label: 'Company Info', short: 'Infos' },
  { id: 2, label: 'Verification', short: 'Vérification' },
  { id: 3, label: 'Documents', short: 'Documents' },
  { id: 4, label: 'Decision', short: 'Décision' },
] as const;

export function formatFailNote(reasonLabel: string, comment?: string): string {
  const trimmed = comment?.trim();
  return trimmed ? `${reasonLabel} — ${trimmed}` : reasonLabel;
}

export function computeConfidenceScore(input: {
  isPhoneVerified: boolean;
  documentCount: number;
  checks: Record<string, CheckStatusValue>;
  docStatuses: Record<string, string>;
}): number {
  let score = 20;
  if (input.isPhoneVerified) score += 15;
  if (input.documentCount > 0) score += 15;
  else score -= 20;

  const checkValues = Object.values(input.checks);
  for (const status of checkValues) {
    if (status === 'PASS') score += 8;
    if (status === 'FAIL') score -= 12;
  }

  const docs = Object.values(input.docStatuses);
  if (docs.length > 0) {
    const approved = docs.filter((s) => s === 'approved').length;
    const correction = docs.filter((s) => s === 'correction_requested' || s === 'rejected').length;
    score += Math.round((approved / docs.length) * 15);
    score -= correction * 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function confidenceTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}
