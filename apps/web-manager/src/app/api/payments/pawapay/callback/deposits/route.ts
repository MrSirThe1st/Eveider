import { createRepositories, parseDepositCallback } from '@eveider/data-access';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const callback = parseDepositCallback(payload);
    if (!callback) {
      return NextResponse.json({ ok: false, error: 'Invalid callback payload' }, { status: 400 });
    }

    const { payments } = createRepositories();
    await payments.applyDepositCallback(callback);

    console.info('[eveider:pawapay:callback:deposits]', callback);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[eveider:pawapay:callback:deposits] error', error);
    return NextResponse.json({ ok: true });
  }
}
