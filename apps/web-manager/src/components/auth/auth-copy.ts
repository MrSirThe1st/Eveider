export type AuthVisual = {
  image: string;
  alt: string;
  kicker?: string;
  title: string;
  body: string;
};

export const LOGIN_VISUAL: AuthVisual = {
  image: '/landing/locker-street.jpg',
  alt: 'Station de casiers Eveider',
  title: 'Livrer et retirer, simplement',
  body: 'Un portail pour les entreprises. Une app pour les destinataires et les coursiers. Un réseau de casiers au milieu.',
};

export const SIGNUP_VISUALS = {
  business: {
    image: '/landing/shop.jpg',
    alt: 'Commerce préparant des colis',
    kicker: 'Entreprises',
    title: 'Expédiez vers un casier',
    body: 'Créez le compte de votre organisation et envoyez des colis dès aujourd’hui. La vérification d’identité reste optionnelle.',
  },
  customer: {
    image: '/landing/pickup.jpg',
    alt: 'Retrait de colis au casier',
    kicker: 'Destinataires',
    title: 'Retirez avec un PIN',
    body: 'Reliez vos colis à votre numéro, suivez l’envoi, et ouvrez le compartiment au casier indiqué.',
  },
  courier: {
    image: '/landing/courier.jpg',
    alt: 'Coursier en tournée',
    kicker: 'Coursiers',
    title: 'Déposez au bon casier',
    body: 'Recevez vos tournées, déposez au casier prévu, confirmez le dépôt, passez à la suite.',
  },
} as const satisfies Record<string, AuthVisual>;

export const OTP_VISUAL: AuthVisual = {
  image: '/landing/packages.jpg',
  alt: 'Colis prêts pour le dépôt',
  kicker: 'Vérification',
  title: 'Confirmez votre numéro',
  body: 'Un code à 6 chiffres active le compte entreprise. Ensuite, le dossier d’inscription continue.',
};

export const AUTH_VISUAL_IMAGES = [
  LOGIN_VISUAL.image,
  SIGNUP_VISUALS.business.image,
  SIGNUP_VISUALS.customer.image,
  SIGNUP_VISUALS.courier.image,
  OTP_VISUAL.image,
] as const;

export const SIGNUP_HEADINGS = {
  business: {
    title: 'Compte organisation',
    sub: 'Pour expédier des colis vers le réseau Eveider. Société enregistrée ou vendeur individuel : même inscription.',
  },
  customer: {
    title: 'Compte destinataire',
    sub: 'Pour suivre vos colis et retirer avec un PIN.',
  },
  courier: {
    title: 'Compte coursier',
    sub: 'Pour les tournées et les dépôts au casier.',
  },
} as const;
