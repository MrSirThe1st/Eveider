export const PARCEL_IMPORT_SHEET = 'Colis';
export const PARCEL_INSTRUCTIONS_SHEET = 'Instructions';

export const PARCEL_IMPORT_HEADERS = [
  'Référence',
  'Mode enlèvement',
  'Nom expéditeur',
  'Téléphone expéditeur',
  'Adresse expéditeur',
  'Nom destinataire',
  'Téléphone destinataire',
  'Email destinataire',
  'Code point',
  'Taille colis',
  'Catégorie',
  'Poids kg',
  'Paiement',
  'Montant COD CDF',
  'Montant COD USD',
] as const;

export const PARCEL_EXPORT_HEADERS = [
  'Numéro de suivi',
  'Référence',
  'Situation',
  'Statut',
  'Mode enlèvement',
  'Nom expéditeur',
  'Téléphone expéditeur',
  'Adresse expéditeur',
  'Nom destinataire',
  'Téléphone destinataire',
  'Email destinataire',
  'Code point',
  'Point',
  'Taille colis',
  'Catégorie',
  'Poids kg',
  'Paiement',
  'Montant COD CDF',
  'Montant COD USD',
  'Frais livraison (FC)',
  'Distance (km)',
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
  'Code point',
  'Point',
  'Compartiment',
  'Statut colis',
  'Mis à jour le',
] as const;

export const PARCEL_IMPORT_INSTRUCTIONS = [
  ['Import colis Eveider — Instructions'],
  [''],
  ['Format', 'Fichier .xlsx uniquement, feuille « Colis », maximum 500 lignes.'],
  [''],
  ['Mode enlèvement', '« Un chauffeur vient chercher » ou « Dépôt au point Eveider »'],
  ['Code point', 'Code Eveider du point (ex. EVPA7K3M2X) — pas le nom du point.'],
  ['Taille colis', 'Petit (S), Moyen (M) ou Grand (L)'],
  [
    'Catégorie',
    'Documents, Mode / textile, Électronique, Alimentaire, Cosmétiques ou Autre',
  ],
  ['Paiement', 'L’expéditeur paie, Le destinataire paie ou Paiement à la livraison'],
  ['Adresse expéditeur', 'Obligatoire si enlèvement coursier'],
  ['Montant COD', 'Requis si paiement à la livraison (CDF ou USD)'],
  [''],
  [
    'Champs obligatoires',
    'Nom expéditeur, téléphone expéditeur, nom destinataire, téléphone destinataire, code point, taille, catégorie, paiement, mode enlèvement',
  ],
];

export const PARCEL_IMPORT_EXAMPLE_ROW = [
  'CMD-001',
  'Un chauffeur vient chercher',
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
  'L’expéditeur paie',
  '',
  '',
];
