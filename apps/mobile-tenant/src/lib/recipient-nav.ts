export const RECIPIENT_PRIMARY_TABS = [
  { key: 'Home', label: 'Accueil', i18nKey: 'tabs.home' as const },
  { key: 'Receive', label: 'Mes colis', i18nKey: 'tabs.receive' as const },
  { key: 'Points', label: 'Points', i18nKey: 'tabs.points' as const },
] as const;

/** Hidden until customer send flow is defined (business → recipient is primary today). */
export const RECIPIENT_HIDDEN_PRIMARY_TABS = ['Envoyer'] as const;

export const RECIPIENT_REMOVED_PRIMARY_TABS = ['Casiers'] as const;
