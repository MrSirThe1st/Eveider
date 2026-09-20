import { isCityStatus, type CityStatus } from '@eveider/domain';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapCity } from '../db/mappers.js';
import type { City } from '../db/types.js';

export type CreateCityInput = {
  code: string;
  name: string;
  notes?: string | null;
  status?: CityStatus;
};

export type UpdateCityInput = {
  code?: string;
  name?: string;
  notes?: string | null;
  status?: CityStatus;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code) === '23505';
}

function isArchiveBlocked(error: unknown): boolean {
  return error instanceof Error && error.message.includes('CITY_HAS_ACTIVE_ZONES');
}

export class CityRepository {
  constructor(private readonly db: Queryable) {}

  async list(
    ctx: DataAccessContext,
    options?: { status?: CityStatus; includeArchived?: boolean },
  ): Promise<City[]> {
    assertAdmin(ctx);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options?.status) {
      params.push(options.status);
      conditions.push(`status = $${params.length}`);
    } else if (!options?.includeArchived) {
      conditions.push(`status = 'active'`);
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
    const result = await this.db.query(
      `SELECT * FROM cities WHERE ${where} ORDER BY name ASC`,
      params,
    );
    return result.rows.map(mapCity);
  }

  async listActiveOptions(): Promise<Array<Pick<City, 'id' | 'code' | 'name'>>> {
    const result = await this.db.query(
      `SELECT id, code, name FROM cities WHERE status = 'active' ORDER BY name ASC`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
    }));
  }

  async findById(id: string): Promise<City | null> {
    const result = await this.db.query(`SELECT * FROM cities WHERE id = $1 LIMIT 1`, [id]);
    return result.rows[0] ? mapCity(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<City | null> {
    const result = await this.db.query(
      `SELECT * FROM cities WHERE lower(name) = lower($1) LIMIT 1`,
      [name.trim()],
    );
    return result.rows[0] ? mapCity(result.rows[0]) : null;
  }

  async assertActive(id: string): Promise<City> {
    const city = await this.findById(id);
    if (!city) throw new Error('Ville introuvable');
    if (city.status !== 'active') {
      throw new Error('Cette ville n’est plus active');
    }
    return city;
  }

  async create(ctx: DataAccessContext, input: CreateCityInput): Promise<City> {
    assertAdmin(ctx);
    const code = normalizeCode(input.code);
    const name = input.name.trim();
    try {
      const created = await this.db.query(
        `INSERT INTO cities (code, name, status, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [code, name, input.status ?? 'active', input.notes?.trim() || null],
      );
      return mapCity(created.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error('Cette ville existe déjà');
      }
      throw error;
    }
  }

  async update(ctx: DataAccessContext, id: string, input: UpdateCityInput): Promise<City> {
    assertAdmin(ctx);
    const existing = await this.findById(id);
    if (!existing) throw new Error('Ville introuvable');

    if (input.status != null && !isCityStatus(input.status)) {
      throw new Error('Statut de ville invalide');
    }

    const nextCode = input.code != null ? normalizeCode(input.code) : existing.code;
    const nextName = input.name?.trim() ?? existing.name;
    const nextStatus = input.status ?? existing.status;
    const nextNotes = input.notes !== undefined ? input.notes?.trim() || null : existing.notes;

    try {
      const updated = await this.db.query(
        `UPDATE cities SET
           code = $1,
           name = $2,
           status = $3,
           notes = $4,
           updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [nextCode, nextName, nextStatus, nextNotes, id],
      );
      return mapCity(updated.rows[0]!);
    } catch (error) {
      if (isArchiveBlocked(error)) {
        throw new Error('Impossible d’archiver une ville qui a encore des zones actives');
      }
      if (isUniqueViolation(error)) {
        throw new Error('Cette ville existe déjà');
      }
      throw error;
    }
  }
}
