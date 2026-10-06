# GitJira — a local learning edition

A working JavaScript issue tracker rebuilt through Astra and Sol design challenges and executable review, structured as a junior-to-senior learning project for CRUD web application development. This is part one of a three-project course — see the [curriculum overview](../CURRICULUM.md) for how it connects to Stockade and Relay.

Suggested path (expanded in the [learning path](journal/LEARNING-PATH.md)):

1. Read the [retrospective](journal/READ-ME-FIRST.txt) for the decisions, disagreements, fixes, and evidence.
2. Run the app (below) and take the [code tour](CODE-TOUR.md) — one promise traced from a button click to a SQL predicate and back.
3. Work the [exercises](EXERCISES.md): break the guarantees and watch the tests catch you, then extend the system, then move a boundary. A [worked example](journal/worked-examples/break-the-cas.md) models the break-and-observe loop once with real output.
4. Study the review findings as diffs in [journal/diffs](journal/diffs/backend-fixes.md), and the design boundaries in the [architecture clinic](journal/ARCHITECTURE-CLINIC.md).

## Run

Requires Node **22.16 or newer** with `node:sqlite`. Tested on the build machine with Node 22.16.0. That version prints an experimental SQLite warning; it is expected.

```powershell
cd C:\Users\Owner\Desktop\astrafinalorganize\gitjira-rebuild
npm ci
npm start
```

Open **http://127.0.0.1:4317**. Dependencies are already installed in this copy. The first launch creates `data/gitjira.sqlite` and a sample board. Later launches preserve your changes. No API key, Docker, or cloud database is required.

For another port: `$env:PORT=4318; npm start`. An optional `DB_PATH` chooses a different database file. Stop the server with Ctrl+C. Copy the entire `data` directory **after stopping the server** to back it up; a running WAL database may have committed data in sidecar files.

## What you can do

- Use board, list, search, and combined status/priority/assignee filters.
- Create projects and manage owners, editors, and viewers.
- Create, assign, edit, move, and archive issues; add comments and inspect activity.
- Open an issue in two tabs and try conflicting edits. A rejected stale edit keeps your draft and offers explicit recovery.
- Switch demo users to see permission and project boundaries.

| Demo account | Initial access |
|---|---|
| Avery Chen | Product launch owner |
| Sam Rivera | Product launch editor |
| Jordan Ellis | Product launch viewer |
| Taylor Brooks | Research lab owner; no Product launch access |

This is **passwordless local demo authentication**. Anyone with access to the running app can select any demo user. The roles demonstrate authorization; they do not establish real identities. The server binds only to `127.0.0.1`, checks the Host header, and rejects cross-origin writes. Do not expose it through a tunnel or deploy it as a public service without replacing demo login and reviewing deployment security.

## Verify

```powershell
npm run check
npm test
npm run test:browser
```

Browser tests use Playwright Chromium. The build machine already had a compatible browser. On a fresh machine, run `npx playwright install chromium` first. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing compatible executable. Tests create isolated temporary databases, not your `data` database. See [verification](journal/VERIFICATION.md) for the exact checks and limits.

Test runs regenerate `test-results/`; that folder is disposable output. The copies under `journal/evidence/` are the preserved record of the original build and are not overwritten. `.github/workflows/ci.yml` runs these same checks on GitHub when this folder is pushed as its own repository (see exercise 3.5).

## Read the implementation

- [Architecture and tradeoffs](ARCHITECTURE.md)
- [API contract](CONTRACT.md)
- [Code tour: one promise end to end](CODE-TOUR.md)
- [Database schema and seed](src/database.js)
- [Server authorization and transactions](src/app.js)
- [Independent API tests](tests/api.test.js)
- [Real process concurrency tests](tests/concurrency.test.js)

The browser application is plain ES modules with no build step, loaded from [public/app.js](public/app.js) (event wiring and boot):

- [public/api.js](public/api.js) — the one fetch wrapper
- [public/state.js](public/state.js) — application state and the request-identity tokens
- [public/dom.js](public/dom.js) — markup helpers and text escaping
- [public/session.js](public/session.js) — sign-in/out and workspace loading
- [public/workspace.js](public/workspace.js) — board, list, activity, and read-only refresh
- [public/dialogs.js](public/dialogs.js) — issue/project/team dialogs and every write

This rebuild implements a complete local issue-tracking workflow, not all features of the original GitJira. No sprints, email, uploads, durable background jobs, external GitHub integration, full-text search index, or production authentication are claimed. Live board refresh is polling; edits remain explicit versioned requests. Within-column issue order is by number, not drag rank. Archive hides an issue; the activity history remains, and this version has no restore UI.

The old organizer contents outside this folder were **not deleted**: automatic approval review blocked the requested deletion. Existing GitHub repositories were not changed by this rebuild.
