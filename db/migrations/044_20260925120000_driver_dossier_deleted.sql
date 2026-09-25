-- Terminal dossier status for admin-deleted chauffeurs.

ALTER TYPE "DriverDossierStatus" ADD VALUE IF NOT EXISTS 'deleted';
