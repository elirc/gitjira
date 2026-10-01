# GitJira Rebuild — agreed implementation boundary

A complete local learning edition of the issue tracker, not a claim of parity with the original GitJira. JavaScript ES modules throughout. Node 22.16+, Express 5, built-in node:sqlite, vanilla browser JS/CSS. No external service or API key. Local-only demo authentication. Bind 127.0.0.1 by default. No automatic GitHub publication.

## Roles and scope

Root: API, database, integration, documentation, journal. Astra frontend agent: public/** only. Sol verification agent: tests/api.test.js and journal/reviews/** only until asked otherwise. Never edit the old organizer folders. Their requested deletion was policy-blocked.

Features: seeded demo accounts, session switching/logout, project creation/switching, owner-managed membership, board and list, issue create/edit/archive, assignment, priority/status filters, text search, comments, persistent activity, explicit stale-write recovery, refresh/poll board. No arbitrary drag rank, file uploads, email, external integrations, sprints, or production identity provider.

## HTTP contract

JSON requests/responses. Same-origin cookie credentials. Error shape `{error: string, code: string, current?: issue}`. For all writes send header `X-GitJira-Request: 1`; browser Origin must match actual host if present. IDs are integers. Demo user IDs: 1=Avery(owner), 2=Sam(editor), 3=Jordan(viewer), 4=Taylor(outsider). Seed project 1=LAUNCH with users 1/2/3; project 2=LAB with user 4 only.

- GET /api/health -> `{ok:true}`
- GET /api/demo-users -> `{users:[{id,name,initials,color}]}`
- POST /api/session `{userId}` -> `{user}` and HttpOnly SameSite=Strict cookie
- GET /api/session -> `{user}` or 401
- DELETE /api/session -> 204
- GET /api/projects -> `{projects:[{id,key,name,description,role,issueCount}]}` membership only
- POST /api/projects `{key,name,description?}` -> 201 `{project}` creator owner; key 2–8 uppercase ASCII letters/digits starting letter
- GET /api/projects/:id/members -> `{members:[{id,name,initials,color,role}]}`
- PUT /api/projects/:id/members/:userId `{role:'owner'|'editor'|'viewer'}` -> `{members}` owner only; last owner cannot be demoted
- DELETE /api/projects/:id/members/:userId -> `{members}` owner only; last owner cannot be removed
- GET /api/projects/:id/issues?q=&status=&priority=&assigneeId= -> `{issues:[issue]}` archived excluded; optional status/priority exact, assigneeId integer or 'unassigned'; q literal substring (title,description,key-number), max 200 chars
- POST /api/projects/:id/issues `{title,description?,status?,priority?,assigneeId?}` -> 201 `{issue}` editors/owners only
- GET /api/issues/:id -> `{issue,comments:[comment]}` member only
- PATCH /api/issues/:id `{version,title?,description?,status?,priority?,assigneeId?}` -> `{issue}` editors/owners; mandatory version compare-and-swap; conflict 409 with current persisted issue, no overwrite
- DELETE /api/issues/:id `{version}` -> 204 (soft archive; editor/owner)
- POST /api/issues/:id/comments `{body}` -> 201 `{comment}` editor/owner
- GET /api/projects/:id/activity -> `{events:[{id,issueId,issueKey,actorName,action,detail,createdAt}]}` newest first, up to 100

Issue shape `{id,projectId,number,key,title,description,status,priority,assigneeId,assigneeName,assigneeInitials,assigneeColor,creatorName,version,createdAt,updatedAt}`. `key` formatted LAUNCH-1. Status: backlog, todo, in_progress, done. Priority: low, medium, high, urgent. Unassigned is null. Max title 180 chars, description 10000, comment 4000, project name 80, description 1000. Dates ISO UTC. Comments `{id,issueId,body,authorName,authorInitials,createdAt}`. Activity action created/updated/archived/commented/member_added/member_updated/member_removed/project_created. `detail` human-readable text.

Mutation + event transaction atomic. Foreign keys, WAL, busy timeout. Per-project number monotonically allocated transactionally. Cross-project access gives 404; viewer writes 403. Invalid request gives 400. Unauthenticated gives 401. No user-generated HTML inserted unsafely. UI must preserve a stale edit draft on 409 and offer explicit loading of current server state; never auto-retry stale edits. Status changes persist only when server accepts. Browser requests should disable duplicate submissions.

## Test harness interface

`import {createApp} from '../src/app.js'`: `const {app,db,close} = createApp({dbPath: ':memory:'})`. Seed idempotently at schema initialization. Tests may listen on port 0. `db` is node:sqlite DatabaseSync for fault injection. `close()` closes DB after server closes. `src/server.js` accepts PORT=0 and DB_PATH; emits `GitJira ready http://127.0.0.1:PORT` when listening. Persisted sessions permit process restart. Check concurrency through separate server processes sharing one file, not just Promise.all in a single synchronous process.
