import { colors } from '@eveider/config-ui';
import { PageFrame } from '@eveider/ui';

type FeatureLockedProps = {
  title: string;
  description: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

export function FeatureLocked({ title, description, breadcrumbs }: FeatureLockedProps) {
  return (
    <PageFrame title={title} description={description} breadcrumbs={breadcrumbs} layout="wide">
      <p style={{ margin: 0, maxWidth: 520, color: colors.textMuted, fontSize: '0.9375rem' }}>
        {description}
      </p>
    </PageFrame>
  );
}
