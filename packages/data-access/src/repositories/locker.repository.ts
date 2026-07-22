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
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import { mapCompartment, mapLocker } from '../db/mappers.js';
import type { Compartment, Locker } from '../db/types.js';

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

export class LockerRepository {
  constructor(private readonly db: Queryable) {}

  async listActiveWithAvailability(): Promise<LockerWithAvailability[]> {
    const lockersResult = await this.db.query(
      `SELECT * FROM lockers
       WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY name ASC`,
    );
    const lockers = lockersResult.rows.map(mapLocker);
    if (lockers.length === 0) return [];

    const ids = lockers.map((l) => l.id);
    const compartmentsResult = await this.db.query(
      `SELECT locker_id, status, size FROM compartments WHERE locker_id = ANY($1)`,
      [ids],
    );

    const byLocker = new Map<string, { status: CompartmentStatus; size: 'small' | 'medium' | 'large' }[]>();
    for (const row of compartmentsResult.rows) {
      const lockerId = String(row.locker_id);
      const list = byLocker.get(lockerId) ?? [];
      list.push({
        status: row.status as CompartmentStatus,
        size: row.size as 'small' | 'medium' | 'large',
      });
      byLocker.set(lockerId, list);
    }

    return lockers.map((locker) => {
      const compartments = byLocker.get(locker.id) ?? [];
      const availableBySize = countAvailableBySize(compartments);
      return {
        ...locker,
        availableCompartments: availableBySize.small + availableBySize.medium + availableBySize.large,
        availableBySize,
      };
    });
  }

  async listSelectableCompartments(lockerId: string): Promise<{
    locker: Pick<Locker, 'id' | 'name' | 'address' | 'rows' | 'columns'>;
    compartments: SelectableCompartment[];
  }> {
    const lockerResult = await this.db.query(
      `SELECT id, name, address, rows, columns FROM lockers
       WHERE id = $1 AND status = 'active' LIMIT 1`,
      [lockerId],
    );
    const lockerRow = lockerResult.rows[0];
    if (!lockerRow) throw new Error(`Locker ${lockerId} not found`);

    const compartmentsResult = await this.db.query(
      `SELECT id, label, size, status FROM compartments
       WHERE locker_id = $1 ORDER BY label ASC`,
      [lockerId],
    );

    return {
      locker: {
        id: String(lockerRow.id),
        name: String(lockerRow.name),
        address: String(lockerRow.address),
        rows: Number(lockerRow.rows),
        columns: Number(lockerRow.columns),
      },
      compartments: compartmentsResult.rows.map((row) => ({
        id: String(row.id),
        label: String(row.label),
        size: row.size as SelectableCompartment['size'],
        status: row.status as SelectableCompartment['status'],
      })),
    };
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
    return this.listSummaries(`status <> 'archived'`);
  }

  async listAllIncludingArchived(ctx: DataAccessContext): Promise<LockerSummary[]> {
    assertAdmin(ctx);
    return this.listSummaries('TRUE');
  }

  private async listSummaries(where: string): Promise<LockerSummary[]> {
    const lockersResult = await this.db.query(
      `SELECT * FROM lockers WHERE ${where} ORDER BY name ASC`,
    );
    const lockers = lockersResult.rows.map(mapLocker);
    if (lockers.length === 0) return [];

    const ids = lockers.map((l) => l.id);
    const compartmentsResult = await this.db.query(
      `SELECT locker_id, status FROM compartments WHERE locker_id = ANY($1)`,
      [ids],
    );

    const byLocker = new Map<string, { status: CompartmentStatus }[]>();
    for (const row of compartmentsResult.rows) {
      const lockerId = String(row.locker_id);
      const list = byLocker.get(lockerId) ?? [];
      list.push({ status: row.status as CompartmentStatus });
      byLocker.set(lockerId, list);
    }

    return lockers.map((locker) => ({
      ...locker,
      compartmentCounts: countCompartmentsByStatus(byLocker.get(locker.id) ?? []),
    }));
  }

  async findById(ctx: DataAccessContext, id: string): Promise<LockerWithCompartments | null> {
    assertAdmin(ctx);
    const lockerResult = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [id]);
    const lockerRow = lockerResult.rows[0];
    if (!lockerRow) return null;

    const compartmentsResult = await this.db.query(
      `SELECT * FROM compartments WHERE locker_id = $1 ORDER BY label ASC`,
      [id],
    );

    return {
      ...mapLocker(lockerRow),
      compartments: compartmentsResult.rows.map(mapCompartment),
    };
  }

  async suggestCode(locationHint: string): Promise<{ code: string; prefix: string }> {
    const prefix = deriveLockerCodePrefix(locationHint);
    const lockers = await this.db.query(
      `SELECT code FROM lockers WHERE code LIKE $1 ORDER BY code DESC LIMIT 50`,
      [`${prefix}-%`],
    );

    let maxSequence = 0;
    for (const row of lockers.rows) {
      const match = String(row.code).match(/-(\d+)$/);
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

    return withTransaction(async (tx) => {
      const lockerResult = await tx.query(
        `INSERT INTO lockers (code, name, address, latitude, longitude, rows, columns, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          code,
          input.name.trim(),
          input.address.trim(),
          input.latitude,
          input.longitude,
          input.rows,
          input.columns,
          input.status,
        ],
      );
      const locker = mapLocker(lockerResult.rows[0]!);

      for (const cell of input.compartments) {
        await tx.query(
          `INSERT INTO compartments (locker_id, label, size, status)
           VALUES ($1, $2, $3, 'available')`,
          [locker.id, cell.label, cell.size],
        );
      }

      const compartmentsResult = await tx.query(
        `SELECT * FROM compartments WHERE locker_id = $1 ORDER BY label ASC`,
        [locker.id],
      );

      return {
        ...locker,
        compartments: compartmentsResult.rows.map(mapCompartment),
      };
    });
  }

  async update(
    ctx: DataAccessContext,
    id: string,
    input: UpdateLockerInput,
  ): Promise<Locker> {
    assertAdmin(ctx);
    const existing = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [id]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Locker ${id} not found`);
    const locker = mapLocker(row);

    const nextStatus = input.status ? transitionLocker(locker.status, input.status) : locker.status;
    const archivedAt =
      nextStatus === 'archived'
        ? locker.archivedAt ?? new Date()
        : locker.archivedAt;

    const result = await this.db.query(
      `UPDATE lockers SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         status = $5,
         archived_at = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        input.name?.trim() ?? null,
        input.address?.trim() ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        nextStatus,
        archivedAt,
        id,
      ],
    );
    return mapLocker(result.rows[0]!);
  }

  async archive(ctx: DataAccessContext, id: string): Promise<Locker> {
    assertAdmin(ctx);

    const activeParcels = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM parcels
       WHERE locker_id = $1 AND status <> 'collected'`,
      [id],
    );
    if (Number(activeParcels.rows[0]?.count ?? 0) > 0) {
      throw new Error('Impossible d’archiver : des colis actifs utilisent ce casier');
    }

    const existing = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [id]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Locker ${id} not found`);
    const locker = mapLocker(row);
    if (locker.status === 'archived') {
      return locker;
    }

    const result = await this.db.query(
      `UPDATE lockers SET status = $1, archived_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [transitionLocker(locker.status, 'archived'), id],
    );
    return mapLocker(result.rows[0]!);
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
    const existing = await this.db.query(
      `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
      [compartmentId, lockerId],
    );
    const row = existing.rows[0];
    if (!row) throw new Error(`Compartment ${compartmentId} not found`);
    const compartment = mapCompartment(row);
    const status = transitionCompartment(compartment.status, nextStatus);
    const result = await this.db.query(
      `UPDATE compartments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, compartmentId],
    );
    return mapCompartment(result.rows[0]!);
  }

  async assertSelectable(lockerId: string): Promise<LockerWithAvailability> {
    const existing = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [lockerId]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Locker ${lockerId} not found`);
    const locker = mapLocker(row);

    if (!isLockerSelectable(locker.status)) {
      throw new Error('Casier indisponible');
    }
    if (locker.latitude == null || locker.longitude == null) {
      throw new Error('Casier sans coordonnées GPS');
    }

    const compartmentsResult = await this.db.query(
      `SELECT status, size FROM compartments WHERE locker_id = $1`,
      [lockerId],
    );
    const compartments = compartmentsResult.rows.map((c) => ({
      status: c.status as CompartmentStatus,
      size: c.size as 'small' | 'medium' | 'large',
    }));
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
