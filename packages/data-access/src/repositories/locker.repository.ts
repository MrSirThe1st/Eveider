import {
  deriveLockerCodePrefix,
  formatLockerCode,
  isLockerSelectable,
  sortByDistance,
  transitionCompartment,
  transitionLocker,
  type CompartmentStatus,
  type LockerStatus,
} from '@eveider/domain';
import type { Compartment, Locker, PrismaClient } from '@prisma/client';
import { assertAdmin, type DataAccessContext } from '../context.js';

export type AvailableBySize = {
  small: number;
  medium: number;
  large: number;
};

export type LockerWithAvailability = Locker & {
  availableCompartments: number;
  availableBySize: AvailableBySize;
};

export type SelectableCompartment = Pick<Compartment, 'id' | 'label' | 'size' | 'status'>;

export type LockerMapMarker = LockerWithAvailability & {
  distanceKm?: number;
};

export type LockerSummary = Locker & {
  compartmentCounts: {
    available: number;
    occupied: number;
    reserved: number;
    total: number;
  };
};

export type LockerWithCompartments = Locker & {
  compartments: Compartment[];
};

export type CreateLockerInput = {
  code?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rows: number;
  columns: number;
  compartments: { label: string; size: 'small' | 'medium' | 'large' }[];
  status: 'active' | 'offline';
};

export type UpdateLockerInput = {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: LockerStatus;
};

function countCompartmentsByStatus(compartments: { status: CompartmentStatus }[]) {
  return {
    available: compartments.filter((c) => c.status === 'available').length,
    occupied: compartments.filter((c) => c.status === 'occupied').length,
    reserved: compartments.filter((c) => c.status === 'reserved').length,
    total: compartments.length,
  };
}

function countAvailableBySize(
  compartments: { status: CompartmentStatus; size: 'small' | 'medium' | 'large' }[],
): AvailableBySize {
  const available = compartments.filter((c) => c.status === 'available');
  return {
    small: available.filter((c) => c.size === 'small').length,
    medium: available.filter((c) => c.size === 'medium').length,
    large: available.filter((c) => c.size === 'large').length,
  };
}

const NON_ARCHIVED_FILTER = { status: { not: 'archived' as const } };

export class LockerRepository {
  constructor(private readonly db: PrismaClient) {}

  async listActiveWithAvailability(): Promise<LockerWithAvailability[]> {
    const lockers = await this.db.locker.findMany({
      where: {
        status: 'active',
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { name: 'asc' },
      include: {
        compartments: {
          select: { status: true, size: true },
        },
        _count: {
          select: {
            compartments: { where: { status: 'available' } },
          },
        },
      },
    });

    return lockers.map(({ compartments, _count, ...locker }) => ({
      ...locker,
      availableCompartments: _count.compartments,
      availableBySize: countAvailableBySize(compartments),
    }));
  }

  async listSelectableCompartments(lockerId: string): Promise<{
    locker: Pick<Locker, 'id' | 'name' | 'address' | 'rows' | 'columns'>;
    compartments: SelectableCompartment[];
  }> {
    const locker = await this.db.locker.findFirstOrThrow({
      where: { id: lockerId, status: 'active' },
      select: { id: true, name: true, address: true, rows: true, columns: true },
    });

    const compartments = await this.db.compartment.findMany({
      where: { lockerId },
      orderBy: { label: 'asc' },
      select: { id: true, label: true, size: true, status: true },
    });

    return { locker, compartments };
  }

  async listNearest(
    origin: { latitude: number; longitude: number },
    options?: { limit?: number; selectableOnly?: boolean },
  ): Promise<LockerMapMarker[]> {
    const limit = options?.limit ?? 10;
    const lockers = await this.listActiveWithAvailability();
    const selectable = options?.selectableOnly
      ? lockers.filter((locker) => locker.availableCompartments > 0)
      : lockers;

    const withCoords = selectable.filter(
      (locker): locker is LockerWithAvailability & { latitude: number; longitude: number } =>
        locker.latitude != null && locker.longitude != null,
    );

    return sortByDistance(origin, withCoords)
      .slice(0, limit)
      .map(({ distanceKm, ...locker }) => ({ ...locker, distanceKm }));
  }

  async listAll(ctx: DataAccessContext): Promise<LockerSummary[]> {
    assertAdmin(ctx);
    const lockers = await this.db.locker.findMany({
      where: NON_ARCHIVED_FILTER,
      orderBy: { name: 'asc' },
      include: {
        compartments: { select: { status: true } },
      },
    });

    return lockers.map((locker) => ({
      ...locker,
      compartmentCounts: countCompartmentsByStatus(locker.compartments),
    }));
  }

  async listAllIncludingArchived(ctx: DataAccessContext): Promise<LockerSummary[]> {
    assertAdmin(ctx);
    const lockers = await this.db.locker.findMany({
      orderBy: { name: 'asc' },
      include: {
        compartments: { select: { status: true } },
      },
    });

    return lockers.map((locker) => ({
      ...locker,
      compartmentCounts: countCompartmentsByStatus(locker.compartments),
    }));
  }

  findById(ctx: DataAccessContext, id: string): Promise<LockerWithCompartments | null> {
    assertAdmin(ctx);
    return this.db.locker.findUnique({
      where: { id },
      include: {
        compartments: { orderBy: { label: 'asc' } },
      },
    });
  }

  async suggestCode(locationHint: string): Promise<{ code: string; prefix: string }> {
    const prefix = deriveLockerCodePrefix(locationHint);
    const lockers = await this.db.locker.findMany({
      where: { code: { startsWith: `${prefix}-` } },
      select: { code: true },
      orderBy: { code: 'desc' },
      take: 50,
    });

    let maxSequence = 0;
    for (const locker of lockers) {
      const match = locker.code.match(/-(\d+)$/);
      if (match) {
        maxSequence = Math.max(maxSequence, Number.parseInt(match[1]!, 10));
      }
    }

    return {
      prefix,
      code: formatLockerCode(prefix, maxSequence + 1),
    };
  }

  async create(ctx: DataAccessContext, input: CreateLockerInput): Promise<LockerWithCompartments> {
    assertAdmin(ctx);

    const expectedCells = input.rows * input.columns;
    if (input.compartments.length !== expectedCells) {
      throw new Error(
        `La grille ${input.rows}×${input.columns} attend ${expectedCells} compartiments`,
      );
    }

    const code = input.code?.trim() ?? (await this.suggestCode(input.address)).code;

    // Nested create uses Prisma's sequential transaction API, which works with
    // Supabase PgBouncer. Interactive $transaction callbacks do not.
    return this.db.locker.create({
      data: {
        code,
        name: input.name.trim(),
        address: input.address.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        rows: input.rows,
        columns: input.columns,
        status: input.status,
        compartments: {
          create: input.compartments.map((cell) => ({
            label: cell.label,
            size: cell.size,
            status: 'available',
          })),
        },
      },
      include: { compartments: { orderBy: { label: 'asc' } } },
    });
  }

  async update(
    ctx: DataAccessContext,
    id: string,
    input: UpdateLockerInput,
  ): Promise<Locker> {
    assertAdmin(ctx);
    const locker = await this.db.locker.findUniqueOrThrow({ where: { id } });

    const nextStatus = input.status ? transitionLocker(locker.status, input.status) : locker.status;

    return this.db.locker.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        address: input.address?.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        status: nextStatus,
        archivedAt: nextStatus === 'archived' ? new Date() : locker.archivedAt,
      },
    });
  }

  async archive(ctx: DataAccessContext, id: string): Promise<Locker> {
    assertAdmin(ctx);

    const activeParcels = await this.db.parcel.count({
      where: {
        lockerId: id,
        status: { notIn: ['collected'] },
      },
    });

    if (activeParcels > 0) {
      throw new Error('Impossible d’archiver : des colis actifs utilisent ce casier');
    }

    const locker = await this.db.locker.findUniqueOrThrow({ where: { id } });
    if (locker.status === 'archived') {
      return locker;
    }

    return this.db.locker.update({
      where: { id },
      data: {
        status: transitionLocker(locker.status, 'archived'),
        archivedAt: new Date(),
      },
    });
  }

  async updateStatus(
    ctx: DataAccessContext,
    id: string,
    nextStatus: LockerStatus,
  ): Promise<Locker> {
    return this.update(ctx, id, { status: nextStatus });
  }

  async updateCompartmentStatus(
    ctx: DataAccessContext,
    lockerId: string,
    compartmentId: string,
    nextStatus: CompartmentStatus,
  ): Promise<Compartment> {
    assertAdmin(ctx);
    const compartment = await this.db.compartment.findFirstOrThrow({
      where: { id: compartmentId, lockerId },
    });
    const status = transitionCompartment(compartment.status, nextStatus);
    return this.db.compartment.update({ where: { id: compartmentId }, data: { status } });
  }

  async assertSelectable(lockerId: string): Promise<LockerWithAvailability> {
    const locker = await this.db.locker.findUniqueOrThrow({ where: { id: lockerId } });
    if (!isLockerSelectable(locker.status)) {
      throw new Error('Casier indisponible');
    }
    if (locker.latitude == null || locker.longitude == null) {
      throw new Error('Casier sans coordonnées GPS');
    }

    const compartments = await this.db.compartment.findMany({
      where: { lockerId },
      select: { status: true, size: true },
    });

    const availableCompartments = compartments.filter((c) => c.status === 'available').length;

    if (availableCompartments === 0) {
      throw new Error('Aucun compartiment disponible à ce casier');
    }

    return {
      ...locker,
      availableCompartments,
      availableBySize: countAvailableBySize(compartments),
    };
  }
}
