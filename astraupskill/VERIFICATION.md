# Read the API evidence and its boundaries

The command evidence appended below identifies accepted checks by exact arguments and terminal exit status. A dependency install or a running process is not a test pass. Counts refer to distinct tests, and targeted reruns do not create additional cases. Earlier failed attempts remain available in the campaign records.

The API helper uses a fresh PostgreSQL cluster bound to loopback with a dedicated test role and database. Migrations run there before tests. The helper stops the cluster and validates its temporary directory before cleanup. It never reuses the user's application database. This makes the concurrency regressions database-backed rather than mocked transactions.

The first complete API attempt exposed an incorrect 403 expectation for nonmembers, a socket test's fixed-delay race and leaked client after assertion failure, and an issue-creation concurrency failure that needed a clearer response assertion. The revised tests preserve the application's authorization contract, synchronize on actual socket events, clean up clients, and report HTTP failures before attempting to read missing issue data.

The full API suite passed 95 cases. After adding the issue-list timestamp projection, the targeted issue and sprint suite passed all 17 cases; these are reruns of existing cases, not extra tests. An intervening run crossed a long host interruption and failed two timeouts and a concurrent request. Its failures remain recorded. The final targeted run and lint passed without a production timeout workaround.

The frontend and shared run passed 17 and 35 cases respectively. Earlier frontend workers exceeded Vitest's fixed startup limit, so the local dependency runner temporarily used START_TIMEOUT=300000 and WORKER_START_TIMEOUT=330000. Its original bytes were restored afterward, and no dependency patch is delivered. Test assertions remained intact. The backlog regression now waits up to 30 seconds for the actual loaded row and rejected-change alert instead of relying on Testing Library's one-second default on this constrained host. These are component tests with intercepted HTTP responses, not a real browser session.

The accepted scope must be read from the final commands, not inferred from this course. Redis workers, deployment, external providers, and browser behavior are separate concerns. Source snapshots permit review of each changed baseline file. The exercises and explanations support learning but do not claim that a reader has demonstrated mastery merely by opening the documentation or running the software tests.

## Source excerpt

From [scripts/test-local.py](../scripts/test-local.py).

```py
"""Run GitJira tests against a helper-owned temporary PostgreSQL cluster."""

import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--postgres-bin",
    default=os.environ.get("PG_BIN", "C:/Program Files/PostgreSQL/18/bin"),
)
parser.add_argument("test_args", nargs=argparse.REMAINDER)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
binary = Path(args.postgres_bin)
suffix = ".exe" if os.name == "nt" else ""
initdb = binary / ("initdb" + suffix)
pgctl = binary / ("pg_ctl" + suffix)
if not initdb.is_file() or not pgctl.is_file():
    parser.error("Supply --postgres-bin pointing to installed PostgreSQL binaries.")

scratch = Path(tempfile.mkdtemp(prefix="gitjira-test-")).resolve()
assert scratch.parent == Path(tempfile.gettempdir()).resolve()
assert scratch.name.startswith("gitjira-test-")
data = scratch / "data"
log = scratch / "postgres.log"
flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
started = False


def run_visible(command, **kwargs):
    print("Running: " + " ".join(map(str, command)), flush=True)
    must_succeed = kwargs.pop("check", False)
    completed = subprocess.run(command, stderr=subprocess.STDOUT, **kwargs)
    if must_succeed:
        completed.check_returncode()
    return completed


try:
    run_visible(
        [
            str(initdb),
            "-D",
            str(data),
            "-U",
            "astra_test",
            "-A",
            "trust",
            "--no-locale",
            "--no-sync",
            "-E",
            "UTF8",
        ],
        check=True,
        creationflags=flags,
    )
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    run_visible(
        [
            str(pgctl),
            "-D",
            str(data),
            "-l",
            str(log),
            "-o",
            f"-p {port} -h 127.0.0.1",
            "-w",
            "start",
        ],
        check=True,
        creationflags=flags,
    )
    started = True
    env = os.environ.copy()
    env["DATABASE_URL"] = (
        f"postgresql://astra_test@127.0.0.1:{port}/gitjira_test"
    )
    if os.name == "nt":
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)

## Recorded command evidence

The accepted test evidence covers **147 distinct passing tests**. The commands below define the verified scope; repeated targeted runs do not increase the count.

| Check                                | Recorded command                                                                                                                                                                                          | Exit | Evidence                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------ |
| `astra-gitjira-api-r4`               | `["python", "scripts/test-local.py", "--", "--maxWorkers=1", "--testTimeout=60000", "--hookTimeout=60000"]`                                                                                               |    0 | [record](evidence/astra-gitjira-api-r4.json), [log](evidence/astra-gitjira-api-r4.log)                             |
| `astra-gitjira-list-sprint-tests-r6` | `["python", "scripts/test-local.py", "--", "test/issue.test.js", "test/sprint.test.js", "--maxWorkers=1", "--testTimeout=60000", "--hookTimeout=60000"]`                                                  |    0 | [record](evidence/astra-gitjira-list-sprint-tests-r6.json), [log](evidence/astra-gitjira-list-sprint-tests-r6.log) |
| `astra-gitjira-web-shared-tests-r4`  | `["node", "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", "run", "test", "-w", "@gitjira/web", "-w", "@gitjira/shared", "--", "--maxWorkers=1", "--testTimeout=60000", "--hookTimeout=60000"]` |    0 | [record](evidence/astra-gitjira-web-shared-tests-r4.json), [log](evidence/astra-gitjira-web-shared-tests-r4.log)   |
| `astra-gitjira-typecheck-r2`         | `["node", "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", "run", "typecheck"]`                                                                                                                 |    0 | [record](evidence/astra-gitjira-typecheck-r2.json), [log](evidence/astra-gitjira-typecheck-r2.log)                 |
| `astra-gitjira-lint-r3`              | `["node", "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", "run", "lint"]`                                                                                                                      |    0 | [record](evidence/astra-gitjira-lint-r3.json), [log](evidence/astra-gitjira-lint-r3.log)                           |
