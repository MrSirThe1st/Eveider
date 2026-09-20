export const PARCEL_IMPORT_SHEET = 'Colis';
export const PARCEL_INSTRUCTIONS_SHEET = 'Instructions';

/** Canonical template headers. Parser still accepts legacy aliases (see parcel-import). */
export const PARCEL_IMPORT_HEADERS = [
  'Référence',
  'Méthode',
  'Nom expéditeur',
  'Téléphone expéditeur',
  'Adresse expéditeur',
  'Nom destinataire',
  'Téléphone destinataire',
  'Email destinataire',
  'Code casier',
  'Taille colis',
  'Catégorie',
  'Poids kg',
] as const;

/** Legacy Excel headers still accepted by the parser. Do not add them to new templates. */
export const PARCEL_IMPORT_LEGACY_HEADERS = [
  'Mode enlèvement',
  'Code point',
  'Paiement',
  'Montant COD CDF',
  'Montant COD USD',
] as const;

export const PARCEL_EXPORT_HEADERS = [
  'Numéro de suivi',
  'Référence',
  'Situation',
  'Statut',
  'Méthode',
  'Nom expéditeur',
  'Téléphone expéditeur',
  'Adresse expéditeur',
  'Nom destinataire',
  'Téléphone destinataire',
  'Email destinataire',
  'Code casier',
  'Casier',
  'Taille colis',
  'Catégorie',
  'Poids kg',
  'Paiement (hérité)',
  'Montant COD CDF (hérité)',
  'Montant COD USD (hérité)',
  'Frais livraison',
  'Devise livraison',
  'Distance (km) (hérité)',
  'Créé le',
  'Modifié le',
] as const;

export const ADMIN_PARCEL_EXPORT_HEADERS = [
  ...PARCEL_EXPORT_HEADERS.slice(0, 2),
  'Organisation',
  ...PARCEL_EXPORT_HEADERS.slice(2),
] as const;

export const DELIVERY_EXPORT_HEADERS = [
  'Livraison',
  'Statut livraison',
  'Chauffeur',
  'Numéro de suivi',
  'Référence',
  'Organisation',
  'Destinataire',
  'Téléphone destinataire',
  'Code casier',
  'Casier',
  'Compartiment',
  'Statut colis',
  'Mis à jour le',
] as const;

export const PARCEL_IMPORT_INSTRUCTIONS = [
  ['Import colis Eveider — Instructions'],
  [''],
  ['Format', 'Fichier .xlsx uniquement, feuille « Colis », maximum 500 lignes.'],
  [''],
  ['Méthode', '« Collecte Eveider » ou « Dépôt au casier » (l’ancien « Mode enlèvement » reste accepté)'],
  ['Code casier', 'Code casier Eveider. Ex. EVPA7K3M2X — pas le nom. L’ancien « Code point » reste accepté.'],
  ['Taille colis', 'Petit (S), Moyen (M) ou Grand (L) — pour le compartiment, pas pour le prix'],
  [
    'Catégorie',
    'Documents, Mode / textile, Électronique, Alimentaire, Cosmétiques ou Autre',
  ],
  ['Adresse expéditeur', 'Obligatoire pour Collecte Eveider'],
  [''],
  [
    'Colonnes héritées (ne plus renseigner)',
    'Paiement, Montant COD CDF, Montant COD USD — acceptées uniquement pour compatibilité.',
  ],
  [''],
  [
    'Champs obligatoires',
    'Nom expéditeur, téléphone expéditeur, nom destinataire, téléphone destinataire, code casier, taille, catégorie, méthode',
  ],
];

export const PARCEL_IMPORT_EXAMPLE_ROW = [
  'CMD-001',
  'Collecte Eveider',
  'Boutique Kin',
  '+243900000001',
  '12 Av. de la Paix, Kinshasa',
  'Jean Mukendi',
  '+243900000002',
  'jean@example.cd',
  'EVPA7K3M2X',
  'Moyen (M)',
  'Documents',
  '1.2',
];
