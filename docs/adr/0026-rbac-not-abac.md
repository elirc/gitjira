# 0026 — RBAC (roles), not ABAC (attributes)

**Status:** accepted · **Sprint:** 13

## Context

We need an authorization model. Two families: **RBAC** (role-based — a user has a
role, a role grants actions) and **ABAC** (attribute-based — policies evaluate
arbitrary attributes of user, resource, and context: "editors in the same region
during business hours").

## Decision

RBAC. Three roles (ADMIN, MEMBER, VIEWER) × a fixed action list, a static matrix
in `packages/shared/src/policy.js`.

## Consequences

- ✅ The matrix is a table a human (and an auditor) can read top to bottom. "Who
  can do X" is a lookup, not a policy-engine trace.
- ✅ It's testable exhaustively — every role × action has an assertion, and the
  doc/code drift test keeps SECURITY.md honest.
- ✅ It fits the domain: our permissions genuinely ARE "what role are you on this
  project", nothing more exotic.
- ❌ No per-attribute rules (time-of-day, IP range, resource labels). We don't
  need them; adding ABAC's policy engine now would be complexity with no payoff.
- ❌ If the product later needs fine-grained conditions, RBAC doesn't stretch to
  them gracefully.

## Migration path (if ABAC ever becomes necessary)

`can(role, action)` is the single choke-point. Widening it to
`can(user, action, resource, context)` is a signature change in ONE module, with
the matrix as the default policy. We adopt ABAC the day a real requirement needs
it — not speculatively. YAGNI applies to security architecture too.
