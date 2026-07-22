import {
  fail,
  ok,
  verifyBusinessPhoneOtpSchema,
  verifyBusinessPhoneOtpResponseSchema,
} from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { verifyBusinessPhoneOtp } from '@/server/auth';
import { resolveCurrentUser } from '@/lib/auth/resolve-current-user';

export async function POST(request: Request) {
  try {
    const current = await resolveCurrentUser();
    if (!current) {
      return NextResponse.json(fail('Non authentifié'), { status: 401 });
    }

    const json = await request.json();
    const parsed = verifyBusinessPhoneOtpSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Code invalide'), {
        status: 400,
      });
    }

    const result = await verifyBusinessPhoneOtp(current.authUser.id, parsed.data.code);
    const response = verifyBusinessPhoneOtpResponseSchema.parse(result);

    return NextResponse.json(ok(response));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : message.includes('incorrect') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
