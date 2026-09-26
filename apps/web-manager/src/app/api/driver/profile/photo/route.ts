import { fail, ok } from '@eveider/api-contracts';
import {
  createRepositories,
  downloadIdentityDocument,
  removeStoredDocument,
  uploadIdentityDocument,
} from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

function parseDataUrl(photoBase64: string): { mimeType: string; bytes: Uint8Array } | null {
  const trimmed = photoBase64.trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (!match) return null;
  const mimeType = match[1]!;
  const raw = match[2]!;
  try {
    const bytes = Uint8Array.from(Buffer.from(raw, 'base64'));
    return { mimeType, bytes };
  } catch {
    return null;
  }
}

/** Stream the authenticated driver's profile photo. */
export async function GET(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { courierDossiers } = createRepositories();
    const dossier = await courierDossiers.findByUserId(auth.session.profile.id);
    if (!dossier?.profilePhotoRef) {
      return withMobileCors(NextResponse.json(fail('Photo introuvable'), { status: 404 }));
    }

    const file = await downloadIdentityDocument(dossier.profilePhotoRef);
    return withMobileCors(
      new NextResponse(Buffer.from(file.bytes), {
        status: 200,
        headers: {
          'Content-Type': file.mimeType,
          'Cache-Control': 'private, max-age=300',
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}

/** Upload or replace profile photo (JSON base64 data URL or multipart "photo"). */
export async function POST(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let bytes: Uint8Array;
    let fileName = 'profile.jpg';
    let declaredMimeType: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('photo');
      if (!(file instanceof File)) {
        return withMobileCors(NextResponse.json(fail('Photo requise'), { status: 400 }));
      }
      bytes = new Uint8Array(await file.arrayBuffer());
      fileName = file.name || 'profile.jpg';
      declaredMimeType = file.type || undefined;
    } else {
      const body = (await request.json().catch(() => null)) as {
        photoBase64?: string;
      } | null;
      if (!body?.photoBase64?.trim()) {
        return withMobileCors(NextResponse.json(fail('Photo requise'), { status: 400 }));
      }
      const parsed = parseDataUrl(body.photoBase64);
      if (!parsed) {
        return withMobileCors(
          NextResponse.json(fail('Photo invalide'), { status: 400 }),
        );
      }
      bytes = parsed.bytes;
      declaredMimeType = parsed.mimeType;
      if (parsed.mimeType.includes('png')) fileName = 'profile.png';
      else if (parsed.mimeType.includes('webp')) fileName = 'profile.webp';
    }

    if (declaredMimeType?.includes('pdf')) {
      return withMobileCors(
        NextResponse.json(fail('Utilisez une photo JPEG, PNG ou WebP'), { status: 400 }),
      );
    }

    const uploaded = await uploadIdentityDocument({
      bytes,
      fileName,
      declaredMimeType,
      kind: 'driver_profile',
      uploadedByUserId: auth.session.profile.id,
      tooSmallError: 'Photo trop petite',
    });

    if (uploaded.mimeType === 'application/pdf') {
      await removeStoredDocument(uploaded.storedRef).catch(() => undefined);
      return withMobileCors(
        NextResponse.json(fail('Utilisez une photo JPEG, PNG ou WebP'), { status: 400 }),
      );
    }

    const { courierDossiers } = createRepositories();
    const current = await courierDossiers.findByUserId(auth.session.profile.id);
    if (current?.profilePhotoRef) {
      await removeStoredDocument(current.profilePhotoRef).catch(() => undefined);
    }

    const dossier = await courierDossiers.updateProfilePhoto(
      auth.session.ctx,
      uploaded.storedRef,
    );

    return withMobileCors(
      NextResponse.json(
        ok({
          profilePhotoRef: dossier.profilePhotoRef,
          hasProfilePhoto: true,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = /trop|Format|requise|invalide|JPEG/i.test(message) ? 400 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}

/** Remove profile photo. */
export async function DELETE(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  try {
    const { courierDossiers } = createRepositories();
    const current = await courierDossiers.findByUserId(auth.session.profile.id);
    if (current?.profilePhotoRef) {
      await removeStoredDocument(current.profilePhotoRef).catch(() => undefined);
    }
    await courierDossiers.updateProfilePhoto(auth.session.ctx, null);
    return withMobileCors(NextResponse.json(ok({ hasProfilePhoto: false })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}
