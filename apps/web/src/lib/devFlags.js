// LEARN: a dev-only affordance so the rollback path is observable on demand.
// The optimistic-update failure case is rare in normal use, which makes it
// easy to ship broken — this toggle forces the next move to fail so you (and
// the PR reviewer, and the junior studying this) can watch the card snap back.
// Guarded to dev builds; it's a debugging tool, not a feature.
let failNext = false;

export function setFailNextMove(value) {
  failNext = Boolean(value);
}

// Consumes the flag: returns whether the next move should fail, and resets.
export function shouldFailNextMove() {
  if (!import.meta.env?.DEV) return false;
  const v = failNext;
  failNext = false;
  return v;
}
