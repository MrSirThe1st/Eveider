export type NavSectionItem = {
  id: string;
  section?: string;
};

export type NavSectionGroup<T extends NavSectionItem> = {
  key: string;
  label: string | null;
  items: T[];
};

export function groupNavModules<T extends NavSectionItem>(modules: T[]): NavSectionGroup<T>[] {
  const groups: NavSectionGroup<T>[] = [];
  for (const item of modules) {
    const label = item.section?.trim() || null;
    const last = groups.at(-1);
    if (last && last.label === label) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key: `${label ?? 'primary'}-${item.id}`,
      label,
      items: [item],
    });
  }
  return groups;
}

export function accountDisplayName(
  userName?: string | null,
  userEmail?: string | null,
  fallback = 'Mon compte',
): string {
  const name = userName?.trim();
  if (name) return name;
  const local = userEmail?.split('@')[0]?.trim();
  if (local) return local;
  return fallback;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}
