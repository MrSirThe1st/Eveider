import { EmptyState, PageFrame } from '@eveider/ui';

type SettingsComingSoonProps = {
  title: string;
  description?: string;
};

export function SettingsComingSoon({
  title,
  description = 'Cette page arrive bientôt.',
}: SettingsComingSoonProps) {
  return (
    <PageFrame title={title} description={description} layout="standard">
      <EmptyState title="Bientôt disponible" description={description} />
    </PageFrame>
  );
}
