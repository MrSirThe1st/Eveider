import {
  buildStoredDocumentRef,
  fail,
} from '@eveider/api-contracts';
import { downloadIdentityDocument } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ key: string[] }> };

function contentDisposition(fileName: string, asAttachment: boolean) {
  const ascii = fileName.replace(/[^\w.\-]+/g, '_') || 'piece';
  const encoded = encodeURIComponent(fileName);
  const type = asAttachment ? 'attachment' : 'inline';
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { key } = await params;
  const objectPath = key.map((segment) => decodeURIComponent(segment)).join('/');
  if (!objectPath || objectPath.includes('..') || objectPath.includes('\\')) {
    return NextResponse.json(fail('Pièce introuvable'), { status: 404 });
  }

  try {
    const file = await downloadIdentityDocument(buildStoredDocumentRef(objectPath));
    const asAttachment = new URL(request.url).searchParams.get('download') === '1';
    return new NextResponse(Buffer.from(file.bytes), {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': contentDisposition(file.fileName, asAttachment),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(fail('Pièce introuvable'), { status: 404 });
  }
}
