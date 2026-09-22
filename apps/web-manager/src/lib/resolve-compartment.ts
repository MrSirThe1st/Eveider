import { createRepositories } from '@eveider/data-access';
import { suggestCompartmentForParcelSize, type PackageSize } from '@eveider/domain';

export async function resolveAvailableCompartmentId(
  lockerId: string,
  packageSize: PackageSize,
): Promise<string> {
  const { lockers } = createRepositories();
  const compartments = await lockers.listAvailableCompartments(lockerId);
  const suggested = suggestCompartmentForParcelSize(compartments, packageSize);
  if (!suggested) {
    throw new Error('Aucun compartiment compatible disponible pour ce casier');
  }
  return suggested.id;
}
