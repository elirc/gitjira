import { keyBetween } from '@gitjira/shared/fractional-index';

// LEARN: pure board helpers, no React. Grouping and position math live here
// so they can be unit-tested without rendering anything, and so the
// components stay about presentation.

// Group issues into columns, each sorted by fractional position.
export function groupByColumn(issues, columns) {
  const byColumn = new Map(columns.map((c) => [c.id, []]));
  for (const issue of issues) {
    if (byColumn.has(issue.columnId)) byColumn.get(issue.columnId).push(issue);
  }
  for (const list of byColumn.values()) {
    list.sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  }
  return byColumn;
}

// Given the destination column's ordered issues and the index the card is
// dropped at, compute the fractional position between its new neighbors.
// LEARN: this is where the ordering utility earns its keep — one call, one
// key, and the DB write touches exactly one row.
export function positionForDrop(columnIssues, dropIndex, movingId) {
  const without = columnIssues.filter((i) => i.id !== movingId);
  const before = dropIndex > 0 ? without[dropIndex - 1] : null;
  const after = dropIndex < without.length ? without[dropIndex] : null;
  return keyBetween(before?.position ?? null, after?.position ?? null);
}
