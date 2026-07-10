# 0027 — Defense in depth (layered controls)

**Status:** accepted · **Sprint:** 13

## Context

No single control is trusted to be perfect. The question is how failures compose.

## Decision

Layer independent controls so that ONE failing doesn't mean a breach:

- **Authentication** (are you who you say) — JWT + rotating refresh tokens.
- **Object-level authz** (may you touch THIS object) — requireMembership.
- **Action-level authz** (may your role do this) — the policy matrix.
- **Input validation** — Zod on every request.
- **Rate limiting** — blunt brute force even if a credential leaks.
- **Security headers** — reduce the blast radius of any XSS.
- **Secret scanning + dependency updates** — catch leaks and known CVEs.

## Consequences

- ✅ The attachment IDOR (Sprint 13 review) is the proof: authentication held,
  but object-level authz was missing — and because those are SEPARATE layers, the
  hole was findable and fixable without touching auth. If they'd been one tangled
  check, the fix would've risked breaking login.
- ✅ "404 not 403 for non-members" is a layer too: even our error messages don't
  leak whether a resource exists.
- ❌ More layers = more places to keep correct; each needs its own test.

## The process corollary

Defense in depth applies to REVIEW, not just runtime. A self-audit is one layer;
an adversarial pentest pass is another. Sprint 13's IDOR slipped the audit and was
caught by the attack — which is the whole argument for having both. Don't let one
reviewer (even yourself) be the only thing between a bug and production.
