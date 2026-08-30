import { CardListSkeleton } from '@eveider/ui';

type SettingsBodySkeletonProps = {
  cards?: number;
};

/**
 * Content-only loading placeholder for Paramètres.
 * Keeps secondary sidebar (and section chrome in layouts) mounted.
 */
export function SettingsBodySkeleton({ cards = 2 }: SettingsBodySkeletonProps) {
  return <CardListSkeleton cards={cards} />;
}
