import { fail, ok, updateDeliveryPricingSchema } from '@eveider/api-contracts';
import { createRepositories, toDeliveryPricingRules } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { pricing } = createRepositories();
    const rules = await pricing.getDeliveryRules();
    return NextResponse.json(
      ok({
        rules: {
          ...toDeliveryPricingRules(rules),
          id: rules.id,
          updatedAt: rules.updatedAt.toISOString(),
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateDeliveryPricingSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { pricing } = createRepositories();
    const rules = await pricing.updateDeliveryRules(auth.session.ctx, body.data);
    return NextResponse.json(
      ok({
        rules: {
          ...toDeliveryPricingRules(rules),
          id: rules.id,
          updatedAt: rules.updatedAt.toISOString(),
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
