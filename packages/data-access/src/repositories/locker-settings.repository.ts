import {
  type AssignmentStrategy,
  type CompartmentSize,
  type LockerNetworkSettings,
  type SizeMatchingMode,
} from '@eveider/domain';
import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import type { LockerLayoutTemplateRow, LockerNetworkSettingsRow } from '../db/types.js';

export type UpdateLockerNetworkSettingsInput = {
  sizeMatchingMode: SizeMatchingMode;
  assignmentStrategy: AssignmentStrategy;
  pickupHoldHours: number;
  pickupReminderHours: number;
};

export type CreateLockerLayoutTemplateInput = {
  name: string;
  description?: string | null;
  rows: number;
  columns: number;
  cells: { label: string; size: CompartmentSize }[];
};

export type UpdateLockerLayoutTemplateInput = {
  name?: string;
  description?: string | null;
  rows?: number;
  columns?: number;
  cells?: { label: string; size: CompartmentSize }[];
};

function mapSettingsRow(row: Record<string, unknown>): LockerNetworkSettingsRow {
  return {
    id: String(row.id),
    sizeMatchingMode: String(row.size_matching_mode) as SizeMatchingMode,
    assignmentStrategy: String(row.assignment_strategy) as AssignmentStrategy,
    pickupHoldHours: Number(row.pickup_hold_hours),
    pickupReminderHours: Number(row.pickup_reminder_hours),
    updatedAt: new Date(String(row.updated_at)),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

function parseCells(raw: unknown): { label: string; size: CompartmentSize }[] {
  const value = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (!Array.isArray(value)) return [];
  return value.map((cell) => {
    const record = cell as Record<string, unknown>;
    return {
      label: String(record.label),
      size: String(record.size) as CompartmentSize,
    };
  });
}

function mapTemplateRow(row: Record<string, unknown>): LockerLayoutTemplateRow {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    rows: Number(row.rows),
    columns: Number(row.columns),
    cells: parseCells(row.cells),
    isStarter: Boolean(row.is_starter),
    archivedAt: row.archived_at == null ? null : new Date(String(row.archived_at)),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    createdBy: row.created_by == null ? null : String(row.created_by),
  };
}

export function toLockerNetworkSettings(row: LockerNetworkSettingsRow): LockerNetworkSettings {
  return {
    sizeMatchingMode: row.sizeMatchingMode,
    assignmentStrategy: row.assignmentStrategy,
    pickupHoldHours: row.pickupHoldHours,
    pickupReminderHours: row.pickupReminderHours,
  };
}

export class LockerSettingsRepository {
  constructor(private readonly db: Queryable) {}

  async getNetworkSettings(): Promise<LockerNetworkSettingsRow> {
    const result = await this.db.query(
      `SELECT * FROM locker_network_settings ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Configuration casiers introuvable');
    }
    return mapSettingsRow(row);
  }

  async updateNetworkSettings(
    ctx: DataAccessContext,
    input: UpdateLockerNetworkSettingsInput,
  ): Promise<LockerNetworkSettingsRow> {
    assertAdmin(ctx);
    const current = await this.getNetworkSettings();
    const result = await this.db.query(
      `UPDATE locker_network_settings
       SET size_matching_mode = $1,
           assignment_strategy = $2,
           pickup_hold_hours = $3,
           pickup_reminder_hours = $4,
           updated_at = NOW(),
           updated_by = $5
       WHERE id = $6
       RETURNING *`,
      [
        input.sizeMatchingMode,
        input.assignmentStrategy,
        input.pickupHoldHours,
        input.pickupReminderHours,
        ctx.userId ?? null,
        current.id,
      ],
    );
    return mapSettingsRow(result.rows[0]!);
  }

  async listTemplates(ctx: DataAccessContext): Promise<LockerLayoutTemplateRow[]> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT * FROM locker_layout_templates
       WHERE archived_at IS NULL
       ORDER BY is_starter DESC, lower(name) ASC`,
    );
    return result.rows.map(mapTemplateRow);
  }

  async findTemplateById(
    ctx: DataAccessContext,
    id: string,
  ): Promise<LockerLayoutTemplateRow | null> {
    assertAdmin(ctx);
    const result = await this.db.query(
      `SELECT * FROM locker_layout_templates WHERE id = $1 AND archived_at IS NULL`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapTemplateRow(row) : null;
  }

  async createTemplate(
    ctx: DataAccessContext,
    input: CreateLockerLayoutTemplateInput,
  ): Promise<LockerLayoutTemplateRow> {
    assertAdmin(ctx);
    const expected = input.rows * input.columns;
    if (input.cells.length !== expected) {
      throw new Error(`La grille ${input.rows}×${input.columns} attend ${expected} compartiments`);
    }

    try {
      const result = await this.db.query(
        `INSERT INTO locker_layout_templates
           (name, description, rows, columns, cells, is_starter, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, FALSE, $6)
         RETURNING *`,
        [
          input.name.trim(),
          input.description?.trim() || null,
          input.rows,
          input.columns,
          JSON.stringify(input.cells),
          ctx.userId ?? null,
        ],
      );
      return mapTemplateRow(result.rows[0]!);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error('Un modèle avec ce nom existe déjà');
      }
      throw err;
    }
  }

  async updateTemplate(
    ctx: DataAccessContext,
    id: string,
    input: UpdateLockerLayoutTemplateInput,
  ): Promise<LockerLayoutTemplateRow> {
    assertAdmin(ctx);
    const current = await this.findTemplateById(ctx, id);
    if (!current) {
      throw new Error('Modèle introuvable');
    }

    const rows = input.rows ?? current.rows;
    const columns = input.columns ?? current.columns;
    const cells = input.cells ?? current.cells;
    const expected = rows * columns;
    if (cells.length !== expected) {
      throw new Error(`La grille ${rows}×${columns} attend ${expected} compartiments`);
    }

    try {
      const result = await this.db.query(
        `UPDATE locker_layout_templates
         SET name = $1,
             description = $2,
             rows = $3,
             columns = $4,
             cells = $5::jsonb,
             updated_at = NOW()
         WHERE id = $6 AND archived_at IS NULL
         RETURNING *`,
        [
          (input.name ?? current.name).trim(),
          input.description === undefined
            ? current.description
            : input.description?.trim() || null,
          rows,
          columns,
          JSON.stringify(cells),
          id,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Modèle introuvable');
      return mapTemplateRow(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error('Un modèle avec ce nom existe déjà');
      }
      throw err;
    }
  }

  async archiveTemplate(ctx: DataAccessContext, id: string): Promise<void> {
    assertAdmin(ctx);
    const current = await this.findTemplateById(ctx, id);
    if (!current) {
      throw new Error('Modèle introuvable');
    }
    if (current.isStarter) {
      throw new Error('Les modèles de démarrage ne peuvent pas être archivés');
    }
    await this.db.query(
      `UPDATE locker_layout_templates
       SET archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL`,
      [id],
    );
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}
