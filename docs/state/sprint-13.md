# State of GitJira — after Sprint 13 (v0.9.0)

**Tag:** `v0.9.0` / `sprint-13` · **PR:** #119 · **Version:** 0.9.0

## What the system can do

Same features as v0.8.0, now with authorization you can defend in a security
review. Who can do what is written down (a permission matrix), enforced in one
place, and tested exhaustively — and a real cross-tenant data-exfiltration bug
(attachment IDOR) is closed.

## The change

```
   MATRIX (docs/SECURITY.md, authoritative)  ── drift-guard test ──►  POLICY (can())
        │                                                                  │
   two-layer authz on every request:  authorize() = requireMembership (object)
                                                   + can(role, action)  (action)
        │
   hardening:  helmet headers · sliding-window rate limit (IP+account)
               gitleaks (secrets) · dependabot (CVEs) · OWASP audit · STRIDE model
        │
   pentest pass caught the IDOR the self-audit missed → exploit test + fix
```

## Metrics

| Metric                  | Value                                                 | Prev   |
| ----------------------- | ----------------------------------------------------- | ------ |
| Central policy module   | `can(role, action)` + matrix                          | none   |
| Authz coverage          | every project-scoped mutation                         | ad-hoc |
| Security findings fixed | IDOR (A01), VIEWER-can-edit, IP-only RL               | —      |
| CI security gates       | gitleaks + dependabot                                 | none   |
| Docs                    | SECURITY.md, OWASP audit, threat model, ADR 0026/0027 | —      |

## Tech-debt register (delta)

| Debt                                  | Why                                                            | Due       |
| ------------------------------------- | -------------------------------------------------------------- | --------- |
| No admin audit log (A09 ⚠️)           | Structured logs exist; a queryable security log is a follow-up | later     |
| No password reset / logout-everywhere | Deferred from the sprint scope                                 | later     |
| CSP on the web app not enforced       | API headers done; full script-src CSP is a web-app task        | sprint 14 |
| Web UI not permission-aware yet       | Server enforces; hiding buttons per role is UX polish          | sprint 14 |

## Known limitations

RBAC (roles), not ABAC — deliberate (ADR 0026). The threat model is
STRIDE-lite, not a compliance artifact. Admin audit log, password reset, and a
web CSP are follow-ups.

## For the junior: what to study here

1. **The matrix precedes the code** — and the drift-guard test that keeps them in sync.
2. **Two-layer authz** — object-level (membership) AND action-level (role); both must pass.
3. **The IDOR** — the pentest review, the exploit-test-first fix, and why the self-audit missed it (checklist of resources, not memory of endpoints).
4. **Rate-limit keying** — why IP-only is worst-of-both and dual-key is right.
5. **Defense in depth** — ADR 0027, and how it applies to the review process too.
