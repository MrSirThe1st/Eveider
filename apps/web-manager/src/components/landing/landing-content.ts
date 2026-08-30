export const HOW_IT_WORKS_STEPS = [
  {
    id: 'expedition',
    step: '01',
    title: 'Envoi',
    description: 'L’entreprise crée le colis.',
  },
  {
    id: 'livraison',
    step: '02',
    title: 'Livraison au casier',
    description: 'Le coursier dépose le colis.',
  },
  {
    id: 'notification',
    step: '03',
    title: 'Notification',
    description: 'Le destinataire reçoit son code.',
  },
  {
    id: 'retrait',
    step: '04',
    title: 'Retrait',
    description: 'Le PIN ouvre le compartiment.',
  },
] as const;

export const SOLUTIONS = [
  {
    id: 'deposer',
    title: 'Déposer',
    description: 'Le coursier ouvre le compartiment assigné et confirme le dépôt. Le colis n’attend plus en boutique.',
    image: '/landing/courier.jpg',
    imageAlt: 'Coursier en tournée avec des colis',
    href: '#a-propos',
  },
  {
    id: 'acheminer',
    title: 'Acheminer',
    description: 'Chaque colis a un suivi. L’entreprise et le destinataire voient où il en est, sans compte côté client.',
    image: '/landing/dispatch.jpg',
    imageAlt: 'Colis prêts à être acheminés',
    href: '#suivi-rapide',
  },
  {
    id: 'recuperer',
    title: 'Récupérer',
    description: 'Le destinataire se présente au casier, saisit le PIN, ouvre le compartiment. Un paiement mobile money peut être demandé avant le PIN.',
    image: '/landing/pickup.jpg',
    imageAlt: 'Retrait de colis',
    href: '/suivi',
  },
] as const;

export const PRODUCT_FEATURES = [
  {
    id: 'depot',
    title: 'Dépôt sécurisé',
    body: 'Le colis est placé dans un compartiment fermé, pas sur un comptoir.',
  },
  {
    id: 'suivi',
    title: 'Suivi des colis',
    body: 'Un numéro de suivi suffit. Pas de compte obligatoire pour le destinataire.',
  },
  {
    id: 'notif',
    title: 'Notification client',
    body: 'Quand le colis est au casier, le destinataire reçoit son code de retrait.',
  },
  {
    id: 'pin',
    title: 'Retrait en casier',
    body: 'Le PIN ouvre le compartiment. Le rendez-vous, c’est le casier.',
  },
] as const;

export const VOICES = [
  {
    id: 'entreprise',
    lens: 'Côté entreprise',
    quote:
      'Vous créez le colis. Un chauffeur dépose au casier. Le destinataire retire quand il peut — le colis ne reste pas en boutique.',
    image: '/landing/shop.jpg',
    imageAlt: 'Point de vente, préparation de commandes',
  },
  {
    id: 'destinataire',
    lens: 'Côté destinataire',
    quote:
      'Vous suivez le colis, puis vous ouvrez le compartiment avec le PIN. Pas de rendez-vous, pas de compte à créer.',
    image: '/landing/pickup.jpg',
    imageAlt: 'Colis prêts à être retirés',
  },
  {
    id: 'coursier',
    lens: 'Côté coursier',
    quote:
      'Vous déposez, vous confirmez, vous continuez. Le point de rendez-vous, c’est le casier, pas le client.',
    image: '/landing/dispatch.jpg',
    imageAlt: 'Colis en cours d’acheminement',
  },
] as const;

export const FAQ_ITEMS = [
  {
    id: 'recuperer',
    question: 'Comment récupérer mon colis ?',
    answer:
      'Lorsque le colis est prêt, vous recevez un suivi et un PIN de retrait. Rendez-vous au casier indiqué, saisissez le PIN et ouvrez le compartiment. Un paiement mobile money peut être demandé avant l’affichage du PIN.',
  },
  {
    id: 'suivre',
    question: 'Comment suivre mon colis ?',
    answer:
      'Entrez votre numéro de suivi Eveider sur cette page ou sur la page Suivi. Vous pouvez aussi rechercher par numéro de téléphone. Aucun compte n’est nécessaire.',
  },
  {
    id: 'envoyer',
    question: 'Comment envoyer des colis avec Eveider ?',
    answer:
      'Créez un compte entreprise, puis un colis : destinataire, casier, suivi. Un chauffeur dépose au casier choisi. Envoyer vos pièces n’est pas obligatoire.',
  },
  {
    id: 'compte-entreprise',
    question: 'Comment créer un compte entreprise ?',
    answer:
      'Utilisez Créer un compte pour inscrire votre activité. Vous pouvez ensuite envoyer des colis depuis le portail.',
  },
  {
    id: 'deposer',
    question: 'Comment déposer un colis en tant que coursier ?',
    answer:
      'Ouvrez la tournée assignée dans l’application coursier, rendez-vous au casier indiqué, déposez le colis, puis confirmez le dépôt.',
  },
] as const;
