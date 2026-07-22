import { fail, ok } from '@eveider/api-contracts';
import { COMPARTMENT_STATUS_LABELS, COMPARTMENT_SIZE_FULL_LABELS } from '@eveider/domain';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { lockers } = createRepositories();
    const { locker, compartments } = await lockers.listSelectableCompartments(id);

    return NextResponse.json(
      ok({
        locker: {
          id: locker.id,
          name: locker.name,
          address: locker.address,
          rows: locker.rows,
          columns: locker.columns,
        },
        compartments: compartments.map((compartment) => ({
          id: compartment.id,
          label: compartment.label,
          size: compartment.size,
          sizeLabel: COMPARTMENT_SIZE_FULL_LABELS[compartment.size],
          status: compartment.status,
          statusLabel: COMPARTMENT_STATUS_LABELS[compartment.status],
          selectable: compartment.status === 'available',
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const notFound =
      message.includes('introuvable') ||
      message.includes('not found') ||
      message.includes('Record to find does not exist');
    const status = notFound ? 404 : 500;
    return NextResponse.json(fail(notFound ? 'Casier introuvable' : message), { status });
  }
}
