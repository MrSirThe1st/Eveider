import type { DataAccessContext } from '@eveider/data-access';
import { createRepositories, toLockerNetworkSettings } from '@eveider/data-access';
import {
  NETWORK_SIZE_DEFINITIONS,
  type AssignmentStrategy,
  type CompartmentCell,
  type SizeMatchingMode,
} from '@eveider/domain';

export type LockerNetworkSettingsDto = {
  id: string;
  sizeMatchingMode: SizeMatchingMode;
  assignmentStrategy: AssignmentStrategy;
  pickupHoldHours: number;
  pickupReminderHours: number;
  updatedAt: string;
  sizeDefinitions: typeof NETWORK_SIZE_DEFINITIONS;
};

export type LockerLayoutTemplateDto = {
  id: string;
  name: string;
  description: string | null;
  rows: number;
  columns: number;
  cells: CompartmentCell[];
  isStarter: boolean;
  capacity: number;
  updatedAt: string;
};

export async function getLockerNetworkSettings(): Promise<LockerNetworkSettingsDto> {
  const { lockerSettings } = createRepositories();
  const row = await lockerSettings.getNetworkSettings();
  return {
    id: row.id,
    ...toLockerNetworkSettings(row),
    updatedAt: row.updatedAt.toISOString(),
    sizeDefinitions: NETWORK_SIZE_DEFINITIONS,
  };
}

export async function listLockerLayoutTemplates(
  ctx: DataAccessContext,
): Promise<LockerLayoutTemplateDto[]> {
  const { lockerSettings } = createRepositories();
  const items = await lockerSettings.listTemplates(ctx);
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    rows: item.rows,
    columns: item.columns,
    cells: item.cells,
    isStarter: item.isStarter,
    capacity: item.cells.length,
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function getLockerLayoutTemplate(
  ctx: DataAccessContext,
  id: string,
): Promise<LockerLayoutTemplateDto | null> {
  const { lockerSettings } = createRepositories();
  const item = await lockerSettings.findTemplateById(ctx, id);
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    rows: item.rows,
    columns: item.columns,
    cells: item.cells,
    isStarter: item.isStarter,
    capacity: item.cells.length,
    updatedAt: item.updatedAt.toISOString(),
  };
}
