# Sol: asynchronous UI review

This review is based on `public/app.js` source inspection while Astra was still refining the frontend. The scenarios below are source-reasoned risks. I have not yet reproduced them in a browser, and I do not label them observed failures.

1. **Project load can be invalidated by a partial refresh.** `loadProject()` and `refresh()` both increment `state.generation`, but refresh fetches only issues and activity. Type in Search on project A, then switch to project B within the 220 ms debounce. B's `loadProject()` renders a loading region; the queued refresh increments generation and can make B's full response return without installing its members. When refresh finishes, `renderView()` finds no `#view-content` under the loading region and returns. The workspace can stay on the loading message. A 25-second poll overlapping a slow project load has the same possibility. This was reported to root and Astra.

2. **Issue dialog completions have no request identity.** `openIssue()` checks `dialog.open` after a GET. Close issue A and open issue B before A's GET finishes: the dialog is open again, so A's response can overwrite B. `reloadIssue()` lacks even the open check. A save response can close a different issue dialog opened while the save was in flight; an old 409 can call `showConflict()` in the new dialog and disable its Save button. Comment and archive completions can similarly alter or close the new dialog. Server endpoints still address the captured old issue for save, but the displayed state and unsaved new draft are at risk. This was reported to root and Astra.

3. **Team dialog can display stale membership.** `openMembers()` awaits a project-specific request, then checks only `dialog.open`; closing and reopening the dialog for a different project lets the old response replace `state.members`. Its error branch also writes to the dialog after closure. Role mutations use `state.projectId` at submission, so a stale list under a new project may issue a write against that new project. API authorization remains enforced, but an owner of both projects could change an unintended membership. This was reported to root and Astra.

The browser and API suites are separate evidence. The API suite passed 12/12; it cannot establish that asynchronous dialogs preserve drafts. I will inspect the frontend revision and append observed results or residual risks.

## Revision review

Astra revised `public/app.js` after the first report. The pending search timer is now cleared on project transitions, refresh skips while a project load is in progress, and session changes invalidate old requests. Issue GET now checks an issue token that changes on dialog close; issue mutations disable dialog controls and Escape dismissal while pending. These changes address the first two source-level scenarios above. I have not independently browser-tested the revision.

The team-dialog path remained open at the time of this second inspection. `openMembers()` awaited a GET and checked only whether the dialog was open, so an A response could populate a newly opened B dialog. `mutateMember()` disabled buttons and selects, but Escape could still dismiss the dialog; after switching to B, a pending A mutation could set global `state.members` to A's team and render B with those members. `refresh()` would reload only B issues and activity, leaving B's member state stale. I sent these specific paths to Astra and root.

The project-create form also left Cancel and Escape available during POST. Closing and reopening it before an old response completed could make that response close the new draft or show its error in the new form. I sent this to Astra and root as a source-reasoned risk.

## Second revision review

Astra's next revision added a member request token with captured project ID, prevented Escape dismissal during a member mutation, disabled member controls while saving, and prevented project dialog dismissal while project creation is pending. Source inspection shows these changes address the reported member and project dialog paths. No browser failure had been reproduced for those earlier paths, and I have not run an isolated browser proof of the fixes.

One session transition risk remained in that revision: `signIn()` set `state.user` as soon as session POST succeeded. If the following workspace GET failed, its catch showed a toast but retained the old workspace DOM because it only rendered login when `state.user` was absent. During Avery-to-Taylor switching, that could leave Avery's old workspace on screen with Taylor's server session. I sent that path to Astra and root as a source-reasoned failure scenario. There is no browser reproduction in this review yet.

## Browser proof and correction

I then reproduced the account-switch problem in isolated headless Chromium with a temporary SQLite database. I signed in as Avery, intercepted one `GET /api/projects` to return 503 during a switch to Taylor, and read both DOM and server session. Before the fix, the DOM still showed **Avery Chen / Product launch** while `GET /api/session` returned **Taylor Brooks**. The browser proof command returned that mismatch. Its first cleanup attempt raced the server's shutdown and left a locked temporary SQLite directory; I waited for the process to stop and removed only that isolated test directory after checking its path.

Astra changed the transition to replace the old UI with a loading screen immediately after session POST and to render a reconnect page if workspace loading fails. I reran the same intercepted browser scenario. The result was `oldWorkspaceVisible:false`, `recoverable:true`, and server session Taylor. Clicking **Try again** then loaded **Taylor Brooks / Research lab**. The second proof exited successfully and cleaned its temporary database after the server process exited.

The member/project dialog corrections were validated by source inspection, not browser execution. This review does not claim exhaustive browser coverage of every delayed response ordering.

Root later wrote and ran `tests/ui-races.mjs` using a separate in-memory application instance and real delayed HTTP responses. I inspected `test-results/ui-race-results.json`: all **7 of 7** recorded scenarios passed, with no uncaught browser errors. Those root-authored checks cover delayed old issue GET, queued search during project load, delayed old team GET, pending issue/member/project mutation dismissal guards, and the account-switch 503 recovery. This is independent supporting evidence; my own browser execution above covered only the account-switch before/after case.
