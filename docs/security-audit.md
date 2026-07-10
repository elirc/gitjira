# OWASP Top 10 — self-audit (Sprint 13)

A walk through the OWASP Top 10 (2021) against the codebase. Each row: where we
stand, and the commit that addresses it.

| #   | Category                         | Status | Notes / fixing commit                                                                                                                                                                                                                                      |
| --- | -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control            | ✅\*   | Central policy matrix + `can()`; VIEWER-can-edit gap closed. Object-level authz via `requireMembership`. **\*IDOR on attachment download found in the pentest review** (not this self-audit) — fixed with an exploit test + object-level check. See below. |
| A02 | Cryptographic Failures           | ✅     | bcrypt cost 12; JWT access + rotating refresh tokens; secrets from env, never committed.                                                                                                                                                                   |
| A03 | Injection                        | ✅     | Prisma parameterizes all queries; the one raw query (JQL search) uses `$queryRaw` tagged params (sprint 6 fix). Zod validates all input.                                                                                                                   |
| A04 | Insecure Design                  | ✅     | Threat model (STRIDE-lite) written; matrix-first design; 404-not-403 for non-members (no existence oracle).                                                                                                                                                |
| A05 | Security Misconfiguration        | ✅     | helmet headers; rate limiting; env validated at boot (fails fast on missing secret).                                                                                                                                                                       |
| A06 | Vulnerable & Outdated Components | ✅     | dependabot enabled; gitleaks in CI; `npm audit` clean.                                                                                                                                                                                                     |
| A07 | Identification & Auth Failures   | ✅     | Rate-limited login; refresh-token rotation + replay detection (sprint 2); no user enumeration on login.                                                                                                                                                    |
| A08 | Software & Data Integrity        | ✅     | Lockfile committed; CI runs from `npm ci`; no dynamic code eval.                                                                                                                                                                                           |
| A09 | Logging & Monitoring Failures    | ⚠️     | Structured request logging (pino); an admin audit log for security events is a follow-up.                                                                                                                                                                  |
| A10 | Server-Side Request Forgery      | ✅     | No user-controlled outbound requests; no URL-fetch feature.                                                                                                                                                                                                |

## The meta-lesson (why the self-audit isn't enough)

This table originally marked A01 a clean ✅. **The adversarial pentest review
proved it wasn't** — `getAttachmentForDownload` checked only authentication, so a
member of one project could download any other project's attachments by id
(cross-tenant data exfiltration, OWASP A01). The self-audit missed it because it
reasoned about the endpoints the author _remembered_ (issues, projects, comments)
and forgot attachments were bolted on in Sprint 5.

**A self-audit finds what you think to look for.** That's not a reason to skip it
— it's the reason you _also_ have someone attack it. Defense in depth applies to
the review process, not just the code (ADR 0027). The takeaways, written into
history on purpose:

- Drive an IDOR sweep from a **checklist of resources**, not a memory of
  endpoints. A resource added late is the one that gets forgotten.
- The only honest proof an authz hole is closed is an **exploit test** — the
  attack, run, denied (`attachment-idor.test.js`).
