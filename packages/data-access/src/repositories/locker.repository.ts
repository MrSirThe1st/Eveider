import {
  availableSlots,
  generatePointCode,
  hasPointAvailability,
  isLockerSelectable,
  isValidPointCode,
  normalizePointCode,
  OCCUPYING_PARCEL_STATUSES,
  sortByDistance,
  transitionCompartment,
  transitionLocker,
  usesCompartmentGrid,
  usesSoftCapacity,
  type CommissionType,
  type CompartmentStatus,
  type LockerStatus,
  type LockerType,
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
  occupyingCount: number;
  availableSlots: number;
  compartmentTotal: number;
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
  occupyingCount: number;
  availableSlots: number;
};

export type LockerWithCompartments = Locker & {
  compartments: Compartment[];
  occupyingCount: number;
  availableSlots: number;
};

export type CreateLockerInput = {
  type?: LockerType;
  code?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rows?: number;
  columns?: number;
  compartments?: { label: string; size: 'small' | 'medium' | 'large' }[];
  maxCapacity?: number;
  contactPhone?: string;
  contactName?: string;
  notes?: string;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
  status: 'active' | 'offline';
};

export type UpdateLockerInput = {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: LockerStatus;
  maxCapacity?: number;
  contactPhone?: string;
  contactName?: string | null;
  notes?: string | null;
  commissionType?: CommissionType | null;
  commissionValue?: number | null;
  commissionCurrency?: string | null;
};

const EMPTY_AVAILABLE_BY_SIZE: AvailableBySize = { small: 0, medium: 0, large: 0 };

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

function withAvailability(
  locker: Locker,
  compartments: { status: CompartmentStatus; size: 'small' | 'medium' | 'large' }[],
  occupyingCount: number,
): LockerWithAvailability {
  const availableBySize = usesCompartmentGrid(locker.type)
    ? countAvailableBySize(compartments)
    : EMPTY_AVAILABLE_BY_SIZE;
  const availableCompartments = availableBySize.small + availableBySize.medium + availableBySize.large;
  const compartmentTotal = usesCompartmentGrid(locker.type)
    ? compartments.length
    : (locker.maxCapacity ?? 0);
  return {
    ...locker,
    availableCompartments,
    availableBySize,
    occupyingCount,
    compartmentTotal,
    availableSlots: availableSlots({
      type: locker.type,
      availableCompartments,
      maxCapacity: locker.maxCapacity,
      occupyingCount,
    }),
  };
}

export class LockerRepository {
  constructor(private readonly db: Queryable) {}

  private async countOccupyingByLockerIds(ids: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) return counts;

    const result = await this.db.query(
      `SELECT locker_id, COUNT(*)::int AS count
       FROM parcels
       WHERE locker_id = ANY($1)
         AND status = ANY($2::"ParcelStatus"[])
       GROUP BY locker_id`,
      [ids, [...OCCUPYING_PARCEL_STATUSES]],
    );

    for (const row of result.rows) {
      counts.set(String(row.locker_id), Number(row.count));
    }
    return counts;
  }

  async listActiveWithAvailability(): Promise<LockerWithAvailability[]> {
    return this.listWithAvailability(
      `l.status = 'active' AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL`,
    );
  }

  /** Name/address picker — no compartment or occupancy aggregates. */
  async listActivePickerOptions(): Promise<Array<{ id: string; name: string; address: string }>> {
    const result = await this.db.query(
      `SELECT id, name, address
       FROM lockers
       WHERE archived_at IS NULL AND status = 'active'
       ORDER BY name ASC`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      address: String(row.address),
    }));
  }

  /** Active, full, and offline points — the network businesses can send parcels to. */
  async listNetworkDirectory(): Promise<LockerWithAvailability[]> {
    return this.listWithAvailability(`l.status IN ('active', 'offline', 'full')`);
  }

  private async listWithAvailability(
    where: string,
    params: unknown[] = [],
  ): Promise<LockerWithAvailability[]> {
    const occupyingParamIndex = params.length + 1;
    const lockersResult = await this.db.query(
      `SELECT l.*,
              COALESCE(c.available, 0)::int AS available_count,
              COALESCE(c.available_small, 0)::int AS available_small,
              COALESCE(c.available_medium, 0)::int AS available_medium,
              COALESCE(c.available_large, 0)::int AS available_large,
              COALESCE(c.total, 0)::int AS compartment_total,
              COALESCE(o.occupying, 0)::int AS occupying_count
       FROM lockers l
       LEFT JOIN (
         SELECT locker_id,
                COUNT(*) FILTER (WHERE status = 'available')::int AS available,
                COUNT(*) FILTER (WHERE status = 'available' AND size = 'small')::int AS available_small,
                COUNT(*) FILTER (WHERE status = 'available' AND size = 'medium')::int AS available_medium,
                COUNT(*) FILTER (WHERE status = 'available' AND size = 'large')::int AS available_large,
                COUNT(*)::int AS total
         FROM compartments
         GROUP BY locker_id
       ) c ON c.locker_id = l.id
       LEFT JOIN (
         SELECT locker_id, COUNT(*)::int AS occupying
         FROM parcels
         WHERE status = ANY($${occupyingParamIndex}::"ParcelStatus"[])
         GROUP BY locker_id
       ) o ON o.locker_id = l.id
       WHERE ${where}
       ORDER BY l.name ASC`,
      [...params, [...OCCUPYING_PARCEL_STATUSES]],
    );

    return lockersResult.rows.map((row) => {
      const locker = mapLocker(row);
      const occupyingCount = Number(row.occupying_count ?? 0);
      const availableBySize = usesCompartmentGrid(locker.type)
        ? {
            small: Number(row.available_small ?? 0),
            medium: Number(row.available_medium ?? 0),
            large: Number(row.available_large ?? 0),
          }
        : EMPTY_AVAILABLE_BY_SIZE;
      const availableCompartments = usesCompartmentGrid(locker.type)
        ? Number(row.available_count ?? 0)
        : 0;
      const compartmentTotal = usesCompartmentGrid(locker.type)
        ? Number(row.compartment_total ?? 0)
        : (locker.maxCapacity ?? 0);
      return {
        ...locker,
        availableCompartments,
        availableBySize,
        occupyingCount,
        compartmentTotal,
        availableSlots: availableSlots({
          type: locker.type,
          availableCompartments,
          maxCapacity: locker.maxCapacity,
          occupyingCount,
        }),
      };
    });
  }

  async listSelectableCompartments(lockerId: string): Promise<{
    locker: Pick<Locker, 'id' | 'name' | 'address' | 'rows' | 'columns' | 'type'>;
    compartments: SelectableCompartment[];
  }> {
    const lockerResult = await this.db.query(
      `SELECT id, name, address, rows, columns, type FROM lockers
       WHERE id = $1 AND status = 'active' LIMIT 1`,
      [lockerId],
    );
    const lockerRow = lockerResult.rows[0];
    if (!lockerRow) throw new Error(`Locker ${lockerId} not found`);

    const type = (lockerRow.type as LockerType | undefined) ?? 'SMART_LOCKER';
    if (!usesCompartmentGrid(type)) {
      throw new Error('Ce point ne dispose pas de compartiments');
    }

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
        type,
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
      ? lockers.filter((locker) =>
          hasPointAvailability({
            type: locker.type,
            status: locker.status,
            availableCompartments: locker.availableCompartments,
            maxCapacity: locker.maxCapacity,
            occupyingCount: locker.occupyingCount,
          }),
        )
      : lockers;

    const withCoords = selectable.filter(
      (locker): locker is LockerWithAvailability & { latitude: number; longitude: number } =>
        locker.latitude != null && locker.longitude != null,
    );

    return sortByDistance(origin, withCoords)
      .slice(0, limit)
      .map(({ distanceKm, ...locker }) => ({ ...locker, distanceKm }));
  }

  async listAll(ctx: DataAccessContext, options?: { search?: string }): Promise<LockerSummary[]> {
    assertAdmin(ctx);
    const params: unknown[] = [];
    let where = `l.status <> 'archived'`;
    if (options?.search?.trim()) {
      params.push(`%${options.search.trim()}%`);
      where += ` AND (l.name ILIKE $${params.length} OR l.code ILIKE $${params.length})`;
    }
    return this.listSummaries(where, params);
  }

  async listAllIncludingArchived(ctx: DataAccessContext): Promise<LockerSummary[]> {
    assertAdmin(ctx);
    return this.listSummaries('TRUE');
  }

  private async listSummaries(where: string, params: unknown[] = []): Promise<LockerSummary[]> {
    const occupyingParamIndex = params.length + 1;
    const lockersResult = await this.db.query(
      `SELECT l.*,
              COALESCE(c.available, 0)::int AS available_count,
              COALESCE(c.occupied, 0)::int AS occupied_count,
              COALESCE(c.reserved, 0)::int AS reserved_count,
              COALESCE(c.total, 0)::int AS compartment_total,
              COALESCE(o.occupying, 0)::int AS occupying_count
       FROM lockers l
       LEFT JOIN (
         SELECT locker_id,
                COUNT(*) FILTER (WHERE status = 'available')::int AS available,
                COUNT(*) FILTER (WHERE status = 'occupied')::int AS occupied,
                COUNT(*) FILTER (WHERE status = 'reserved')::int AS reserved,
                COUNT(*)::int AS total
         FROM compartments
         GROUP BY locker_id
       ) c ON c.locker_id = l.id
       LEFT JOIN (
         SELECT locker_id, COUNT(*)::int AS occupying
         FROM parcels
         WHERE status = ANY($${occupyingParamIndex}::"ParcelStatus"[])
         GROUP BY locker_id
       ) o ON o.locker_id = l.id
       WHERE ${where}
       ORDER BY l.name ASC`,
      [...params, [...OCCUPYING_PARCEL_STATUSES]],
    );

    return lockersResult.rows.map((row) => {
      const locker = mapLocker(row);
      const occupyingCount = Number(row.occupying_count ?? 0);
      const compartmentCounts = {
        available: Number(row.available_count ?? 0),
        occupied: Number(row.occupied_count ?? 0),
        reserved: Number(row.reserved_count ?? 0),
        total: Number(row.compartment_total ?? 0),
      };
      return {
        ...locker,
        compartmentCounts,
        occupyingCount,
        availableSlots: availableSlots({
          type: locker.type,
          availableCompartments: compartmentCounts.available,
          maxCapacity: locker.maxCapacity,
          occupyingCount,
        }),
      };
    });
  }

  async findById(ctx: DataAccessContext, id: string): Promise<LockerWithCompartments | null> {
    assertAdmin(ctx);
    const lockerResult = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [id]);
    const lockerRow = lockerResult.rows[0];
    if (!lockerRow) return null;

    const locker = mapLocker(lockerRow);
    const [compartmentsResult, occupyingCounts] = await Promise.all([
      this.db.query(`SELECT * FROM compartments WHERE locker_id = $1 ORDER BY label ASC`, [id]),
      this.countOccupyingByLockerIds([id]),
    ]);
    const occupyingCount = occupyingCounts.get(id) ?? 0;
    const compartments = compartmentsResult.rows.map(mapCompartment);

    return {
      ...locker,
      compartments,
      occupyingCount,
      availableSlots: availableSlots({
        type: locker.type,
        availableCompartments: compartments.filter((c) => c.status === 'available').length,
        maxCapacity: locker.maxCapacity,
        occupyingCount,
      }),
    };
  }

  async suggestCode(_locationHint?: string): Promise<{ code: string; prefix: string }> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generatePointCode();
      const existing = await this.db.query(`SELECT id FROM lockers WHERE code = $1 LIMIT 1`, [code]);
      if (!existing.rows[0]) {
        return { prefix: 'EVP', code };
      }
    }
    throw new Error('Impossible de générer un code point unique');
  }

  async create(ctx: DataAccessContext, input: CreateLockerInput): Promise<LockerWithCompartments> {
    assertAdmin(ctx);

    const type = input.type ?? 'SMART_LOCKER';
    let code = input.code?.trim()
      ? normalizePointCode(input.code)
      : (await this.suggestCode(input.address)).code;

    if (input.code?.trim() && !isValidPointCode(code)) {
      throw new Error('Code point invalide (ex. EVPA7K3M2X)');
    }

    // Retry once if a suggested code collides.
    const existingCode = await this.db.query(`SELECT id FROM lockers WHERE code = $1 LIMIT 1`, [
      code,
    ]);
    if (existingCode.rows[0]) {
      if (input.code?.trim()) {
        throw new Error('Ce code point existe déjà');
      }
      code = (await this.suggestCode(input.address)).code;
    }

    if (usesCompartmentGrid(type)) {
      const rows = input.rows;
      const columns = input.columns;
      const compartments = input.compartments ?? [];
      if (rows == null || columns == null) {
        throw new Error('Dimensions de grille requises');
      }
      const expectedCells = rows * columns;
      if (compartments.length !== expectedCells) {
        throw new Error(`La grille ${rows}×${columns} attend ${expectedCells} compartiments`);
      }

      return withTransaction(async (tx) => {
        const lockerResult = await tx.query(
          `INSERT INTO lockers (
             code, name, address, latitude, longitude, rows, columns, status, type
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            code,
            input.name.trim(),
            input.address.trim(),
            input.latitude,
            input.longitude,
            rows,
            columns,
            input.status,
            type,
          ],
        );
        const locker = mapLocker(lockerResult.rows[0]!);

        for (const cell of compartments) {
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
          occupyingCount: 0,
          availableSlots: compartments.length,
        };
      });
    }

    if (!usesSoftCapacity(type)) {
      throw new Error(`Type de point non supporté: ${type}`);
    }
    if (input.maxCapacity == null || input.maxCapacity < 1) {
      throw new Error('Capacité maximale requise');
    }
    if (!input.contactPhone?.trim()) {
      throw new Error('Téléphone de contact requis');
    }

    const lockerResult = await this.db.query(
      `INSERT INTO lockers (
         code, name, address, latitude, longitude, rows, columns, status, type,
         max_capacity, contact_phone, contact_name, notes,
         commission_type, commission_value, commission_currency
       ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        code,
        input.name.trim(),
        input.address.trim(),
        input.latitude,
        input.longitude,
        input.status,
        type,
        input.maxCapacity,
        input.contactPhone.trim(),
        input.contactName?.trim() || null,
        input.notes?.trim() || null,
        input.commissionType ?? null,
        input.commissionValue ?? null,
        input.commissionCurrency ?? null,
      ],
    );
    const locker = mapLocker(lockerResult.rows[0]!);
    return {
      ...locker,
      compartments: [],
      occupyingCount: 0,
      availableSlots: input.maxCapacity,
    };
  }

  async update(ctx: DataAccessContext, id: string, input: UpdateLockerInput): Promise<Locker> {
    assertAdmin(ctx);
    const existing = await this.db.query(`SELECT * FROM lockers WHERE id = $1 LIMIT 1`, [id]);
    const row = existing.rows[0];
    if (!row) throw new Error(`Locker ${id} not found`);
    const locker = mapLocker(row);

    if (usesSoftCapacity(locker.type) && input.maxCapacity != null && input.maxCapacity < 1) {
      throw new Error('Capacité maximale invalide');
    }

    const nextStatus = input.status ? transitionLocker(locker.status, input.status) : locker.status;
    const archivedAt =
      nextStatus === 'archived' ? (locker.archivedAt ?? new Date()) : locker.archivedAt;

    const result = await this.db.query(
      `UPDATE lockers SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         status = $5,
         archived_at = $6,
         max_capacity = COALESCE($7, max_capacity),
         contact_phone = COALESCE($8, contact_phone),
         contact_name = CASE WHEN $9::boolean THEN $10 ELSE contact_name END,
         notes = CASE WHEN $11::boolean THEN $12 ELSE notes END,
         commission_type = CASE WHEN $13::boolean THEN $14::"CommissionType" ELSE commission_type END,
         commission_value = CASE WHEN $15::boolean THEN $16 ELSE commission_value END,
         commission_currency = CASE WHEN $17::boolean THEN $18 ELSE commission_currency END,
         updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        input.name?.trim() ?? null,
        input.address?.trim() ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        nextStatus,
        archivedAt,
        input.maxCapacity ?? null,
        input.contactPhone?.trim() ?? null,
        input.contactName !== undefined,
        input.contactName === undefined ? null : input.contactName?.trim() || null,
        input.notes !== undefined,
        input.notes === undefined ? null : input.notes?.trim() || null,
        input.commissionType !== undefined,
        input.commissionType ?? null,
        input.commissionValue !== undefined,
        input.commissionValue ?? null,
        input.commissionCurrency !== undefined,
        input.commissionCurrency ?? null,
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
      throw new Error('Impossible d’archiver : des colis actifs utilisent ce point');
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
      throw new Error('Point indisponible');
    }
    if (locker.latitude == null || locker.longitude == null) {
      throw new Error('Point sans coordonnées GPS');
    }

    const [compartmentsResult, occupyingCounts] = await Promise.all([
      this.db.query(`SELECT status, size FROM compartments WHERE locker_id = $1`, [lockerId]),
      this.countOccupyingByLockerIds([lockerId]),
    ]);
    const compartments = compartmentsResult.rows.map((c) => ({
      status: c.status as CompartmentStatus,
      size: c.size as 'small' | 'medium' | 'large',
    }));
    const withAvail = withAvailability(locker, compartments, occupyingCounts.get(lockerId) ?? 0);

    if (
      !hasPointAvailability({
        type: withAvail.type,
        status: withAvail.status,
        availableCompartments: withAvail.availableCompartments,
        maxCapacity: withAvail.maxCapacity,
        occupyingCount: withAvail.occupyingCount,
      })
    ) {
      throw new Error(
        usesSoftCapacity(locker.type)
          ? 'Capacité maximale atteinte pour ce point'
          : 'Aucun compartiment disponible à ce point',
      );
    }

    return withAvail;
  }
}
