import { createRepositories, toLockerNetworkSettings } from '@eveider/data-access';
import { suggestCompartmentForParcelSize, type PackageSize } from '@eveider/domain';

export async function resolveAvailableCompartmentId(
  lockerId: string,
  packageSize: PackageSize,
): Promise<string> {
  const { lockers, lockerSettings } = createRepositories();
  const [compartments, settingsRow] = await Promise.all([
    lockers.listAvailableCompartments(lockerId),
    lockerSettings.getNetworkSettings(),
  ]);
  const suggested = suggestCompartmentForParcelSize(
    compartments,
    packageSize,
    toLockerNetworkSettings(settingsRow),
  );
  if (!suggested) {
    throw new Error('Aucun compartiment compatible disponible pour ce casier');
  }
  return suggested.id;
}
