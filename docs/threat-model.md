# Threat model — STRIDE-lite (auth + board)

A lightweight STRIDE pass over the two highest-value flows: authentication and
the project board. STRIDE = Spoofing, Tampering, Repudiation, Information
disclosure, Denial of service, Elevation of privilege. For each: the threat, and
the control that addresses it.

## Authentication

| STRIDE                | Threat                                 | Control                                                                                           |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **S**poofing          | Steal a session and impersonate a user | Short-lived access token; httpOnly refresh cookie; refresh rotation + replay detection (sprint 2) |
| **T**ampering         | Forge a JWT                            | Signed tokens (JWT_SECRET); signature verified every request                                      |
| **R**epudiation       | "I never logged in / changed that"     | Structured request logs; admin audit log (follow-up)                                              |
| **I**nfo disclosure   | Enumerate valid emails via login/reset | Uniform responses — no "user not found" vs "wrong password" distinction                           |
| **D**enial of service | Brute-force / credential-stuff login   | Sliding-window rate limit, keyed on IP AND account                                                |
| **E**levation         | Low-priv user gains admin              | Central policy matrix; role checked server-side on every action                                   |

## Project board

| STRIDE                | Threat                                    | Control                                                                                               |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **S**poofing          | Act as another project member             | Every request authenticated; actorId from the verified token, never the body                          |
| **T**ampering         | Modify an issue you shouldn't             | Object-level (membership) + action-level (role) authz on every mutation                               |
| **R**epudiation       | Deny making a change                      | Activity log records actor + kind per change                                                          |
| **I**nfo disclosure   | Read another project's data (incl. by id) | requireMembership on every project-scoped read; **IDOR sweep** closed attachment download (sprint 13) |
| **D**enial of service | Exhaust the DB with huge queries          | Cursor pagination + bounded payloads (sprint 12); request size limits                                 |
| **E**levation         | VIEWER performs a write                   | can(role, action) — VIEWER is read-only, enforced and tested                                          |

## What this model is NOT

Lightweight on purpose. It skips infrastructure threats (network, host, supply
chain beyond dependabot) and assumes a trusted deployment. It's a thinking tool
to make sure each high-value flow has named controls — not a compliance artifact.
