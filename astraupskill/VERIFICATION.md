# Read the API evidence and its boundaries

The command evidence lives in [evidence/](evidence/): each accepted run has a `.json` record (exact command, start/finish time, exit code) and the `.log` it produced. The records were captured in a staging copy on the author's machine in September 2026, so their `cwd` paths will not exist on yours. A dependency install or a running process is not a test pass. Counts refer to distinct tests, and targeted reruns do not create additional cases. Earlier failed attempts were kept in the original campaign records. Those are not in this repository; only the accepted runs below are.

| Record | Command (abridged) | Result line in the log |
| --- | --- | --- |
| `astra-gitjira-api-r4` | `python scripts/test-local.py -- --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000` | `Test Files 23 passed (23)`, `Tests 95 passed (95)` |
| `astra-gitjira-list-sprint-tests-r6` | same helper, `test/issue.test.js test/sprint.test.js` only | `Tests 17 passed (17)` |
| `astra-gitjira-web-shared-tests-r4` | `npm run test -w @gitjira/web -w @gitjira/shared` | web `17 passed`, shared `35 passed` |
| `astra-gitjira-lint-r3` | `npm run lint` | exit code 0 |
| `astra-gitjira-typecheck-r2` | `npm run typecheck` | exit code 0 |

The API helper uses a fresh PostgreSQL cluster bound to loopback with a dedicated test role and database. Migrations run there before tests (`apps/api/test/global-setup.js` runs `prisma migrate deploy`). The helper stops the cluster and validates its temporary directory before cleanup. It never reuses the user's application database. This makes the concurrency regressions database-backed rather than mocked transactions.

The first complete API attempt exposed an incorrect 403 expectation for nonmembers, a socket test's fixed-delay race and leaked client after assertion failure, and an issue-creation concurrency failure that needed a clearer response assertion. The revised tests preserve the application's authorization contract, synchronize on actual socket events, clean up clients, and report HTTP failures before attempting to read missing issue data.

The full API suite passed 95 cases. After adding the issue-list timestamp projection, the targeted issue and sprint suite passed all 17 cases; these are reruns of existing cases, not extra tests. An intervening run crossed a long host interruption and failed two timeouts and a concurrent request; that run is one of the campaign records not kept here. The final targeted run and lint passed without a production timeout workaround.

The frontend and shared run passed 17 and 35 cases respectively. Earlier frontend workers exceeded Vitest's fixed startup limit, so the local dependency runner temporarily used START_TIMEOUT=300000 and WORKER_START_TIMEOUT=330000. Its original bytes were restored afterward, and no dependency patch is delivered. Test assertions remained intact. The backlog regression now waits up to 30 seconds for the actual loaded row and rejected-change alert instead of relying on Testing Library's one-second default on this constrained host. These are component tests with intercepted HTTP responses, not a real browser session.

The accepted scope must be read from the final commands, not inferred from this course. Redis workers, deployment, external providers, and browser behavior are separate concerns. Source snapshots in [snapshots/](snapshots/) permit review of each changed baseline file. The exercises and explanations support learning but do not claim that a reader has demonstrated mastery merely by opening the documentation or running the software tests.

## Running it yourself

`scripts/test-local.py` needs Node, an `npm ci` at the repo root, and local PostgreSQL binaries. It looks for `initdb` and `pg_ctl` in `--postgres-bin`, then `PG_BIN`, then a Windows default (`C:/Program Files/PostgreSQL/18/bin`). On another OS, pass the path explicitly:

```bash
python scripts/test-local.py --postgres-bin /usr/lib/postgresql/16/bin -- test/sprint.test.js
```

Arguments after `--` go to Vitest in the `@gitjira/api` workspace. The script makes a scratch directory under the system temp folder (prefix `gitjira-test-`), runs `initdb` with a trust-auth `astra_test` role, and starts the server on a free loopback port. It sets `DATABASE_URL` to `gitjira_test` on that port and runs the API tests. In a `finally` block it stops the server and deletes the scratch directory, and it asserts the directory's location and prefix before removing it.

## Evidence exercises (read-only)

1. **Goal:** confirm the count claims against the raw logs, not this page.
   **Check:** `grep -h "Tests  " astraupskill/evidence/*.log` prints exactly four result lines: 95, 17, 17 and 35.
2. **Goal:** confirm the cleanup cannot delete the wrong directory.
   **Check:** in `scripts/test-local.py` the scratch path's parent must equal `tempfile.gettempdir()` and its name must start with `gitjira-test-`. This is asserted once after creation (lines 32–33) and again just before `shutil.rmtree` (lines 111–113).

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
