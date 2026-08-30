import type { ReactNode } from 'react';
import { SettingsSecondaryNav } from '@/components/settings-secondary-nav';
import type { SettingsNavGroup } from '@/lib/settings-nav';

type SettingsLayoutShellProps = {
  groups: SettingsNavGroup[];
  children: ReactNode;
};

export function SettingsLayoutShell({ groups, children }: SettingsLayoutShellProps) {
  return (
    <div
      className="settings-layout-shell"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        width: '100%',
        minHeight: '100%',
      }}
    >
      <SettingsSecondaryNav groups={groups} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <style>{`
        @media (max-width: 900px) {
          .settings-layout-shell {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
