import { generateHoldingZoneCode, generateOperatingCityCode, isCityStatus, type CityStatus } from '@eveider/domain';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapCity } from '../db/mappers.js';
import type { City, DrcCatalogCity } from '../db/types.js';

export type CreateCityInput = {
  drcCityId: string;
  notes?: string | null;
};

export type UpdateCityInput = {
  notes?: string | null;
  status?: CityStatus;
};

const CITY_SELECT = `SELECT c.*, p.name AS province
       FROM cities c
       LEFT JOIN drc_cities dc ON dc.id = c.drc_city_id
       LEFT JOIN drc_provinces p ON p.id = dc.province_id`;

function uniqueConstraint(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'constraint' in error) {
    return String((error as { constraint: string }).constraint);
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code) === '23505';
}

function isArchiveBlocked(error: unknown): boolean {
  return error instanceof Error && error.message.includes('CITY_HAS_ACTIVE_ZONES');
}

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code) === '23503';
}

function countValue(row: unknown): number {
  if (typeof row !== 'object' || row === null || !('count' in row)) return 0;
  return Number((row as { count: unknown }).count) || 0;
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
      conditions.push(`c.status = $${params.length}`);
    } else if (!options?.includeArchived) {
      conditions.push(`c.status = 'active'`);
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
    const result = await this.db.query(
      `${CITY_SELECT} WHERE ${where} ORDER BY c.name ASC`,
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

  async listCatalog(): Promise<DrcCatalogCity[]> {
    const result = await this.db.query(
      `SELECT dc.id, dc.name, p.name AS province
       FROM drc_cities dc
       JOIN drc_provinces p ON p.id = dc.province_id
       ORDER BY p.name ASC, dc.name ASC`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      province: String(row.province),
    }));
  }

  async findById(id: string): Promise<City | null> {
    const result = await this.db.query(`${CITY_SELECT} WHERE c.id = $1 LIMIT 1`, [id]);
    return result.rows[0] ? mapCity(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<City | null> {
    const result = await this.db.query(
      `${CITY_SELECT} WHERE lower(c.name) = lower($1) LIMIT 1`,
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
    const catalog = await this.findCatalogCity(input.drcCityId);
    const existing = await this.findByDrcCityId(catalog.id);

    if (existing?.status === 'active') {
      throw new Error('Cette ville est déjà dans le réseau');
    }

    let city: City;
    if (existing) {
      city = await this.update(ctx, existing.id, {
        status: 'active',
        notes: input.notes !== undefined ? input.notes : existing.notes,
      });
    } else {
      city = await this.insertOperatingCity(catalog, input.notes?.trim() || null);
    }

    await this.ensureHoldingZone(city);
    return (await this.findById(city.id)) ?? city;
  }

  async update(ctx: DataAccessContext, id: string, input: UpdateCityInput): Promise<City> {
    assertAdmin(ctx);
    const existing = await this.findById(id);
    if (!existing) throw new Error('Ville introuvable');

    if (input.status != null && !isCityStatus(input.status)) {
      throw new Error('Statut de ville invalide');
    }

    const nextStatus = input.status ?? existing.status;
    const nextNotes = input.notes !== undefined ? input.notes?.trim() || null : existing.notes;

    if (nextStatus === 'archived' && existing.status !== 'archived') {
      const neighborhoods = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM service_areas
         WHERE city_id = $1 AND is_holding = false AND status = 'active'`,
        [id],
      );
      if (countValue(neighborhoods.rows[0]) > 0) {
        throw new Error('Impossible d’archiver une ville qui a encore des zones actives');
      }
      const lockers = await this.db.query(
        `SELECT COUNT(*)::int AS count
         FROM lockers l
         JOIN service_areas sa ON sa.id = l.service_area_id
         WHERE sa.city_id = $1 AND l.archived_at IS NULL AND l.status <> 'archived'`,
        [id],
      );
      if (countValue(lockers.rows[0]) > 0) {
        throw new Error(`Impossible d’archiver ${existing.name} : réassignez d’abord ses casiers`);
      }
      await this.db.query(
        `UPDATE service_areas SET status = 'archived', updated_at = NOW()
         WHERE city_id = $1 AND is_holding = true`,
        [id],
      );
    }

    if (nextStatus === 'active' && existing.status === 'archived') {
      await this.db.query(
        `UPDATE service_areas SET status = 'active', updated_at = NOW()
         WHERE city_id = $1 AND is_holding = true`,
        [id],
      );
    }

    try {
      const updated = await this.db.query(
        `UPDATE cities SET
           status = $1,
           notes = $2,
           updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        [nextStatus, nextNotes, id],
      );
      if (!updated.rows[0]) throw new Error('Ville introuvable');
      const city = await this.findById(id);
      if (!city) throw new Error('Ville introuvable');
      return city;
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

  async delete(ctx: DataAccessContext, id: string): Promise<void> {
    assertAdmin(ctx);
    const existing = await this.findById(id);
    if (!existing) throw new Error('Ville introuvable');

    const neighborhoods = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM service_areas
       WHERE city_id = $1 AND is_holding = false`,
      [id],
    );
    if (countValue(neighborhoods.rows[0]) > 0) {
      throw new Error(`Impossible de supprimer ${existing.name} : supprimez d’abord ses zones`);
    }

    const lockers = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM lockers l
       JOIN service_areas sa ON sa.id = l.service_area_id
       WHERE sa.city_id = $1`,
      [id],
    );
    if (countValue(lockers.rows[0]) > 0) {
      throw new Error(`Impossible de supprimer ${existing.name} : réassignez d’abord ses casiers`);
    }

    try {
      await this.db.query(`DELETE FROM service_areas WHERE city_id = $1`, [id]);
      await this.db.query(`DELETE FROM cities WHERE id = $1`, [id]);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(`Impossible de supprimer ${existing.name} : réassignez d’abord ses casiers`);
      }
      throw error;
    }
  }

  private async findCatalogCity(id: string): Promise<DrcCatalogCity> {
    const result = await this.db.query(
      `SELECT dc.id, dc.name, p.name AS province
       FROM drc_cities dc
       JOIN drc_provinces p ON p.id = dc.province_id
       WHERE dc.id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Ville introuvable dans le référentiel');
    return {
      id: String(row.id),
      name: String(row.name),
      province: String(row.province),
    };
  }

  private async findByDrcCityId(drcCityId: string): Promise<City | null> {
    const result = await this.db.query(`${CITY_SELECT} WHERE c.drc_city_id = $1 LIMIT 1`, [drcCityId]);
    return result.rows[0] ? mapCity(result.rows[0]) : null;
  }

  private async insertOperatingCity(catalog: DrcCatalogCity, notes: string | null): Promise<City> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateOperatingCityCode();
      try {
        const created = await this.db.query(
          `INSERT INTO cities (code, name, status, notes, drc_city_id)
           VALUES ($1, $2, 'active', $3, $4)
           RETURNING id`,
          [code, catalog.name, notes, catalog.id],
        );
        const city = await this.findById(String(created.rows[0]!.id));
        if (!city) throw new Error('Ville introuvable');
        return city;
      } catch (error) {
        const constraint = uniqueConstraint(error);
        if (constraint === 'cities_code_key' && attempt < 7) continue;
        if (constraint === 'cities_name_key' || constraint === 'cities_drc_city_id_key') {
          throw new Error('Cette ville existe déjà');
        }
        if (isUniqueViolation(error) && attempt < 7) continue;
        if (isUniqueViolation(error)) {
          throw new Error('Cette ville existe déjà');
        }
        throw error;
      }
    }
    throw new Error('Impossible de créer la ville');
  }

  private async ensureHoldingZone(city: City): Promise<void> {
    const existing = await this.db.query(
      `SELECT id, status FROM service_areas WHERE city_id = $1 AND is_holding = true LIMIT 1`,
      [city.id],
    );
    const holding = existing.rows[0];
    if (holding) {
      if (String(holding.status) === 'archived') {
        await this.db.query(
          `UPDATE service_areas SET status = 'active', updated_at = NOW() WHERE id = $1`,
          [String(holding.id)],
        );
      }
      return;
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateHoldingZoneCode();
      try {
        const created = await this.db.query(
          `INSERT INTO service_areas (code, name, city, city_id, status, is_holding)
           VALUES ($1, $2, $3, $4, 'active', true)
           RETURNING id`,
          [code, city.name, city.name, city.id],
        );
        const zoneId = String(created.rows[0]!.id);
        await this.db.query(
          `INSERT INTO zone_pricing (zone_id, outbound_delivery_amount, return_delivery_amount)
           VALUES ($1, NULL, NULL)`,
          [zoneId],
        );
        return;
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 7) continue;
        throw error;
      }
    }
    throw new Error('Impossible de créer la zone à répartir');
  }
}
