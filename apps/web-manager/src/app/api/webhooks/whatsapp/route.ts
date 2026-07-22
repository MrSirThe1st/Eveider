import { NextResponse, type NextRequest } from 'next/server';

function getVerifyToken(): string | null {
  const token =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ||
    process.env.VERIFY_TOKEN?.trim();
  return token || null;
}

/** Meta webhook subscription verification (GET). */
export async function GET(request: NextRequest) {
  const verifyToken = getVerifyToken();
  if (!verifyToken) {
    return NextResponse.json({ error: 'Webhook verify token not configured' }, { status: 503 });
  }

  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/** Incoming WhatsApp events (POST). Ack immediately — process async later if needed. */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.info('[eveider:whatsapp:webhook]', JSON.stringify(payload));
  } catch {
    // Meta expects 200 even on malformed payloads during setup tests.
  }

  return NextResponse.json({ ok: true });
}
