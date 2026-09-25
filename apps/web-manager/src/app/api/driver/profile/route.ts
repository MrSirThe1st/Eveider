import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
  DRIVER_DOSSIER_STATUS_LABELS,
  DRIVER_OPERATIONAL_STATUS_LABELS,
  deriveDriverOperationalStatus,
  type DriverDossierStatus,
  type DriverOperationalStatus,
} from '@eveider/domain';
import { NextResponse } from 'next/server';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

function formatDriverCode(dossierId: string): string {
  const compact = dossierId.replace(/-/g, '').slice(-5).toUpperCase();
  return `DRV-${compact}`;
}

function documentStatus(
  dossierStatus: DriverDossierStatus,
  hasIdentityDocument: boolean,
): 'verified' | 'pending' | 'needs_correction' | 'missing' {
  if (dossierStatus === 'needs_correction') return 'needs_correction';
  if (dossierStatus === 'rejected') return 'missing';
  if (hasIdentityDocument) {
    if (
      dossierStatus === 'approved' ||
      dossierStatus === 'invited' ||
      dossierStatus === 'active' ||
      dossierStatus === 'pending_review'
    ) {
      return 'verified';
    }
  }
  if (dossierStatus === 'pending_review') return 'pending';
  return hasIdentityDocument ? 'verified' : 'missing';
}

export async function GET(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { courierDossiers, memberships, deliveries } = createRepositories();
    const profile = auth.session.profile;
    const dossier = await courierDossiers.findByUserId(profile.id);

    if (!dossier) {
      return withMobileCors(
        NextResponse.json(fail('Dossier chauffeur introuvable'), { status: 404 }),
      );
    }

    const [orgRows, courierDeliveries] = await Promise.all([
      memberships.listByUserIdWithOrgFlags(profile.id),
      deliveries.listForCourier(auth.session.ctx),
    ]);

    const driverMembership =
      orgRows.find((row) => row.role === 'driver') ?? orgRows[0] ?? null;
    const hasActiveDelivery = courierDeliveries.some((item) =>
      item.status === 'assigned' ||
      item.status === 'scanned' ||
      item.status === 'drop_off_pending',
    );

    const operationalStatus: DriverOperationalStatus = deriveDriverOperationalStatus({
      dossierStatus: dossier.status,
      contractorType: dossier.contractorType,
      isBlocked: Boolean(profile.isBlocked),
      deactivated: Boolean(profile.deactivatedAt) || dossier.status === 'deactivated',
      hasActiveDelivery,
    });

    const hasIdentityDocument = Boolean(dossier.idDocumentUrl?.trim());
    const identityDocumentStatus = documentStatus(dossier.status, hasIdentityDocument);

    return withMobileCors(
      NextResponse.json(
        ok({
          fullName: dossier.fullName || profile.fullName,
          phone: dossier.phone || profile.phone,
          email: dossier.email || profile.email,
          driverCode: formatDriverCode(dossier.id),
          dossierId: dossier.id,
          accountStatus: dossier.status,
          accountStatusLabel: DRIVER_DOSSIER_STATUS_LABELS[dossier.status],
          operationalStatus,
          operationalStatusLabel: DRIVER_OPERATIONAL_STATUS_LABELS[operationalStatus],
          organization: driverMembership
            ? {
                id: driverMembership.businessId,
                name: driverMembership.organizationName,
                isPlatformOrg: driverMembership.isPlatformOrg,
              }
            : null,
          contractorType: dossier.contractorType,
          documents: [
            {
              key: 'identity',
              status: identityDocumentStatus,
            },
          ] as const,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
