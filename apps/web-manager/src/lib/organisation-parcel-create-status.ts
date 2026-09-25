const ZONE_SERVICE_UNAVAILABLE_MESSAGE =
  'La livraison Eveider n’est pas encore disponible pour ce casier. Choisissez un autre casier ou contactez Eveider.';

export function organisationParcelCreateStatus(err: unknown): { status: number; message: string } {
  if (typeof err === 'object' && err && 'code' in err && (err.code === 'P2002' || err.code === '23505')) {
    return { status: 409, message: 'Cette référence existe déjà' };
  }
  const message = err instanceof Error ? err.message : 'Erreur serveur';
  if (message.includes('cannot submit parcels')) {
    return {
      status: 403,
      message:
        "Votre compte n'est pas encore activé. Vous pourrez envoyer des colis dès qu'Eveider l'aura accepté.",
    };
  }
  if (
    message.includes('COD') ||
    message.includes('Compartiment requis') ||
    message.includes('Aucun compartiment compatible') ||
    message.includes('Adresse expéditeur') ||
    message.includes('Montant COD')
  ) {
    return { status: 400, message };
  }
  if (
    message.includes('ZONE_PRICING_NOT_CONFIGURED') ||
    message.includes('Zone tarifaire') ||
    message.includes('zone de service') ||
    message.includes('ville n’est plus active') ||
    message.includes("ville n'est plus active")
  ) {
    return { status: 409, message: ZONE_SERVICE_UNAVAILABLE_MESSAGE };
  }
  if (message.includes('indisponible') || message.includes('introuvable') || message.includes('CANONICAL')) {
    return { status: 409, message };
  }
  return { status: 500, message };
}
