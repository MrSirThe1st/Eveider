import type { ReactNode } from 'react';
import { SettingsSecondaryNav } from '@/components/settings-secondary-nav';
import type { SettingsNavGroup } from '@/lib/settings-nav';

type SettingsLayoutShellProps = {
  groups: SettingsNavGroup[];
  children: ReactNode;
};

export function SettingsLayoutShell({ groups, children }: SettingsLayoutShellProps) {
  return (
    <div className="settings-layout-shell">
      <SettingsSecondaryNav groups={groups} />
      <div className="settings-layout-shell__content">{children}</div>
    </div>
  );
}
