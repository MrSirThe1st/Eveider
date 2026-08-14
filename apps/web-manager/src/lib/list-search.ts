/** Normalize text for case-insensitive partial matching in admin list filters. */
export function normalizeListSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesListSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const normalized = normalizeListSearchQuery(query);
  if (!normalized) return true;
  return fields.some((field) => field?.toLowerCase().includes(normalized));
}
