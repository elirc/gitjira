# Verification — 1 October 2026

Final checks on the completed code:

| Command | Observed result |
|---|---|
| `npm run check` | 9 JavaScript files passed syntax checks |
| `npm test` | 12 passed; 0 failed, skipped, or cancelled; about 6 seconds |
| `npm run test:browser` | 9 workflow + 7 delayed/failure-response scenarios passed |
| Browser runtime errors | None uncaught in either suite |
| Install-time npm audit | 71 packages audited; 0 known vulnerabilities reported |

Runtime: Node 22.16.0, npm 10.9.2, SQLite 3.49.1; locked Express 5.2.1 and Playwright 1.63.0. Chromium was already installed. No browser download or native build-tool installation was needed.

## API and process checks

Sol's independent suite verifies session cookies and logout, expiry, malformed/oversized JSON, NUL rejection and strict IDs, valid escaped maximum-length text, membership isolation, viewer write denial, lifecycle/comments/activity, literal search and combined filters, stale PATCH/DELETE behavior, project keys, last-owner protection, member removal/unassignment, and rollback for create/edit/comment/member changes. A forced SQL activity trigger proves rollback and preserved issue numbering.

Two actual server processes share one file database. Their same-version edits yield exactly one 200 and one 409; concurrent creates allocate distinct consecutive numbers. A new process preserves the winner and session after restart. This is correctness evidence for those cases, not a throughput benchmark or power-loss test.

## Browser checks

Workflow scenarios cover login and seed board; create/assign/reload; literal HTML-looking text; comments while retaining a field draft; status changes; combined filters; list/activity; two contexts with stale-write recovery; membership controls and visible last-owner rejection; viewer UI plus a forged write; project creation and outsider isolation; archive; 390px layout; keyboard dialog close; and logout.

The timing suite holds real responses to check stale issue/team data after dialog transitions, queued search during project loading, pending issue/member/project mutation dismissal guards, and failed workspace load after account switching with explicit recovery.

Screenshots in `evidence/` were inspected. Labels and native dialogs are present; this is not a full accessibility audit. Chromium is the only browser engine tested.

## Findings and provenance

- Sol's initial test wrongly assumed no seeded issues. The test baseline was corrected; the seed remained.
- Astra observed NUL truncation, nonprimitive ID coercion, and parser/field-size disagreement through in-memory HTTP probes. Root fixed them; Sol added regressions.
- Sol identified UI timing risks in source. Astra added request identities and pending-write guards. Root's delayed-response suite checks the resulting behavior.
- Sol also reproduced the account-switch/503 stale-workspace failure in Chromium before the fix and verified recovery afterward. See [its review](reviews/05-sol-ui-review.md).

Tests use isolated in-memory or temporary databases, not the user's application database. Logs such as `forced activity failure` are expected injected failures whose rollback is asserted.

## Reproduce

Run `npm ci`, `npm run check`, `npm test`, and `npm run test:browser`. A fresh machine may need `npx playwright install chromium`. Generated results go to `test-results/`; the copies under `evidence/` record this build. Saved API output is the final completion chunk including suite totals, labeled accordingly.

Limits are in [README](../README.md) and [ARCHITECTURE](../ARCHITECTURE.md). No deployment or GitHub push occurred. Old organizer deletion was attempted but blocked by automatic approval review, so that portion of the request remains uncompleted.
