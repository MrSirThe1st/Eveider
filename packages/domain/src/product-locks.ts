/**
 * Phase 2 product locks — hide/lock without dropping schema.
 * Messages are French and safe to return from APIs.
 */
export const PRODUCT_LOCKS = {
  orgDriverAssign:
    'L’entreprise ne peut pas assigner de chauffeur. Eveider Operations s’en charge.',
  orgDriverManage: 'La gestion des chauffeurs n’est plus disponible pour l’entreprise.',
  eveiderDriversOnly: 'Seuls les chauffeurs Eveider peuvent être assignés.',
  legacyReturn: 'Les retours de ce type ne sont plus disponibles.',
  nonSmartLocker: 'Seuls les casiers intelligents sont disponibles.',
  customerLockerReselect: 'Le point de destination ne peut plus être modifié.',
  codDisabled: 'Le paiement à la livraison n’est pas disponible.',
} as const;
