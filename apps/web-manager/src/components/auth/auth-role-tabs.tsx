'use client';

import styles from './auth-shell.module.css';

export type SignupRole = 'business' | 'customer';

const TABS: { id: SignupRole; label: string }[] = [
  { id: 'business', label: 'Entreprise' },
  { id: 'customer', label: 'Client' },
];

type AuthRoleTabsProps = {
  value: SignupRole;
  onChange: (role: SignupRole) => void;
};

export function AuthRoleTabs({ value, onChange }: AuthRoleTabsProps) {
  const activeIndex = TABS.findIndex((tab) => tab.id === value);

  return (
    <div className={styles.tabs} role="tablist" aria-label="Type de compte">
      <span
        className={styles.tabPill}
        aria-hidden="true"
        style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
      />
      {TABS.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`signup-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`signup-panel-${tab.id}`}
            className={selected ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
