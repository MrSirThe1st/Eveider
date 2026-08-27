import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toBusinessLockerDto } from '@/lib/locker-presenter';
import { requireBusinessSession } from '@/lib/session';

export async function GET() {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { lockers } = createRepositories();
    const items = await lockers.listActiveWithAvailability();

    return NextResponse.json(
      ok({
        lockers: items.map((locker) => {
          const dto = toBusinessLockerDto(locker);
          return {
            id: dto.id,
            name: dto.name,
            networkLabel: dto.networkLabel,
            address: dto.address,
            type: dto.type,
            typeLabel: dto.typeLabel,
            status: dto.status,
            operatingStatus: dto.operatingStatus,
            operatingStatusLabel: dto.operatingStatusLabel,
            capacity: dto.capacity,
            availableCompartments: dto.availableCompartments,
            availableSlots: dto.availableSlots,
            availableLabel: dto.availableLabel,
            availableBySize: dto.availableBySize,
            rows: dto.rows,
            columns: dto.columns,
            latitude: dto.latitude,
            longitude: dto.longitude,
            selectable: dto.selectable,
          };
        }),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
