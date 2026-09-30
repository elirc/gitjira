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
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Node.js is required")
        npm_cli = Path(node).parent / "node_modules/npm/bin/npm-cli.js"
        if not npm_cli.is_file():
            raise RuntimeError("Expected npm CLI beside the Node.js installation")
        command = [node, str(npm_cli), "run", "test", "-w", "@gitjira/api"]
    else:
        command = ["npm", "run", "test", "-w", "@gitjira/api"]
    if args.test_args:
        command.extend(["--", *(args.test_args[1:] if args.test_args[0] == "--" else args.test_args)])
    outcome = run_visible(command, cwd=root, env=env, creationflags=flags)
finally:
    if started:
        run_visible(
            [str(pgctl), "-D", str(data), "-m", "fast", "-w", "stop"],
            check=True,
            creationflags=flags,
        )
        print("Owned PostgreSQL cluster stopped.", flush=True)
    assert scratch.parent == Path(tempfile.gettempdir()).resolve()
    assert scratch.name.startswith("gitjira-test-")
    shutil.rmtree(scratch)

raise SystemExit(outcome.returncode)
