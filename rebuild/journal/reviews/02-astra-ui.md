# Astra UI implementation and review

## Scope delivered

I built `public/index.html`, `public/style.css`, `public/app.js`, and a local SVG favicon against `CONTRACT.md`. This is a working browser client: demo sessions, projects, member roles, issue board/list, activity, filters, issue creation/editing/archival, and comments all use the API. No external fonts, CDN assets, or UI packages are required.

## Decisions and rationale

- The interface uses a dark navigation column, an off-white workspace, muted teal actions, and restrained priority colors. Cards show issue key, title, priority, assignee, and last update without burying the work under decorative metrics. The summary counts describe the currently filtered issues.
- Status changes happen through a labeled native select in the issue dialog. This supports keyboard and touch users without pretending to offer persistent drag ordering that the API does not implement.
- Native modal dialogs supply focus containment and Escape behavior. Mutations temporarily disable controls and prevent dismissal until a response arrives, avoiding duplicate writes or a delayed response modifying a new dialog.
- A version conflict preserves the field values, disables further stale save/archive attempts, and exposes an explicit “Load latest version” action that warns it replaces the current draft. The app never retries a stale write automatically.
- Polling runs every 25 seconds only when the page is visible and no dialog is open. It refreshes issue/activity content without replacing filter inputs. Project loads, account transitions, and dialog reads have response-identity guards.
- User-provided text is escaped before markup insertion. No user HTML is interpreted. The demo login explains its local, passwordless scope.

## Actual review exchange

Sol identified source-level asynchronous races: an outstanding debounced search or polling refresh could invalidate a project load; a dismissed issue or membership fetch could populate a later dialog; and dismissing a pending write could let its response affect the next dialog. I added timer cancellation, a project-loading gate, session/generation checks, dialog identity tokens, and mutation dismissal guards. This was a concrete code review, not a simulated design debate.

## Verification and limits

- `node --check public/app.js` passed after implementation and again after the async guards.
- Root is performing the integrated browser checks against the actual Node server. Their results belong in the integration record rather than being claimed here.
- The responsive board uses two columns on narrower screens. Native dialogs and controls retain keyboard access, focus indicators, semantic labels, and reduced-motion support.
- This learning edition deliberately does not add drag rank, deadlines, labels, attachments, or archive restoration beyond the agreed API. Activity is capped by the API at the most recent 100 events.
- Polling refreshes issues and activity; membership changes made in another session are reflected on reopening the team dialog or reloading the workspace. The API remains authoritative for permissions.
