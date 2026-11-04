// Helpers for cursor-paged lists.

/** Append a new page to the rows already shown, skipping any row (by id) that
 * is already present. Keyset pagination should never repeat a row, but a
 * cheap guard keeps React keys unique even if a page is ever re-requested. */
export function appendPage<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((row) => row.id))
  const fresh = incoming.filter((row) => !seen.has(row.id))
  return fresh.length === 0 ? existing : [...existing, ...fresh]
}
