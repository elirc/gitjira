# OWASP Top 10 — self-audit (Sprint 13)

A walk through the OWASP Top 10 (2021) against the codebase. Each row: where we
stand, and the commit that addresses it.

| #   | Category                         | Status | Notes / fixing commit                                                                                                                    |
| --- | -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control            | ✅     | Central policy matrix + `can()`; VIEWER-can-edit gap closed. Object-level authz via `requireMembership`.                                 |
| A02 | Cryptographic Failures           | ✅     | bcrypt cost 12; JWT access + rotating refresh tokens; secrets from env, never committed.                                                 |
| A03 | Injection                        | ✅     | Prisma parameterizes all queries; the one raw query (JQL search) uses `$queryRaw` tagged params (sprint 6 fix). Zod validates all input. |
| A04 | Insecure Design                  | ✅     | Threat model (STRIDE-lite) written; matrix-first design; 404-not-403 for non-members (no existence oracle).                              |
| A05 | Security Misconfiguration        | ✅     | helmet headers; rate limiting; env validated at boot (fails fast on missing secret).                                                     |
| A06 | Vulnerable & Outdated Components | ✅     | dependabot enabled; gitleaks in CI; `npm audit` clean.                                                                                   |
| A07 | Identification & Auth Failures   | ✅     | Rate-limited login; refresh-token rotation + replay detection (sprint 2); no user enumeration on login.                                  |
| A08 | Software & Data Integrity        | ✅     | Lockfile committed; CI runs from `npm ci`; no dynamic code eval.                                                                         |
| A09 | Logging & Monitoring Failures    | ⚠️     | Structured request logging (pino); an admin audit log for security events is a follow-up.                                                |
| A10 | Server-Side Request Forgery      | ✅     | No user-controlled outbound requests; no URL-fetch feature.                                                                              |

_This table reflects the author's self-audit. The adversarial review pass is next
(Phase 3 of the PR) — anything it finds gets added here with the commit that fixed
it._
