import {
  businessInfoStepSchema,
  fail,
  legalVerificationStepSchema,
  ok,
  operationsSetupStepSchema,
  paymentSetupStepSchema,
} from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const businessId = auth.session.profile.businessId!;

  try {
    const json = await request.json();
    const { step, payload } = json;

    const { businessOnboarding } = createRepositories();

    if (step === 1) {
      const parsed = businessInfoStepSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Étape 1 invalide'), {
          status: 400,
        });
      }
      const business = await businessOnboarding.saveBusinessInfo(businessId, parsed.data);
      return NextResponse.json(ok({ step: 1, business }));
    }

    if (step === 2) {
      const parsed = legalVerificationStepSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Étape 2 invalide'), {
          status: 400,
        });
      }
      const business = await businessOnboarding.saveLegalVerification(businessId, parsed.data);
      return NextResponse.json(ok({ step: 2, business }));
    }

    if (step === 3) {
      const parsed = operationsSetupStepSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Étape 3 invalide'), {
          status: 400,
        });
      }
      const business = await businessOnboarding.saveOperationsSetup(businessId, parsed.data);
      return NextResponse.json(ok({ step: 3, business }));
    }

    if (step === 4) {
      const parsed = paymentSetupStepSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Étape 4 invalide'), {
          status: 400,
        });
      }
      const business = await businessOnboarding.savePaymentSetup(businessId, parsed.data);
      return NextResponse.json(ok({ step: 4, business }));
    }

    return NextResponse.json(fail("Numéro d'étape invalide"), { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
