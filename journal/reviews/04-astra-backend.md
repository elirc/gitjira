# Astra backend challenge review

Reviewed 2026-10-01, against the backend present at 15:37 UTC. Reviewer: Astra backend challenge agent. Scope: read-only review of CONTRACT.md and src/app.js, src/database.js, src/server.js. No application source or test files edited. Five HTTP probes ran against createApp({dbPath: ':memory:'}) on an ephemeral loopback listener; that listener and database were closed afterward. No persistent application database was opened.

## Findings

1. **P2: Embedded NUL in accepted text produces truncated returned data or a 500.** `src/app.js:34-37` validates type, length, and whitespace but permits U+0000. With owner session, POST `/api/projects/1/issues` and `{ "title": "hello\u0000there" }` returned **201** with `issue.title` equal to `"hello"`. A title beginning with U+0000 returned **500 INTERNAL**. The first case visibly loses the accepted suffix on read; later edits using returned values can permanently overwrite that suffix. The shared validator also handles descriptions, names, and comment bodies. Reject embedded U+0000 with a 400 validation error before storage, and test both internal and leading NUL. These are observed outcomes, not merely a hypothetical SQL concern.

2. **P3: ID coercion accepts arrays and throws for ordinary malformed objects.** `src/app.js:25-28` coerces arbitrary JSON values through String/Number. POST `/api/session` with `{ "userId": [1] }` returned **200** and Avery's account. `{ "userId": { "toString": 1 } }` returned **500 INTERNAL**. This violates the integer-ID and invalid-request-400 contract. It is not a privilege escalation in the deliberately passwordless demo. Guard the input type before coercion; retain digit strings for route/query parameters, and reject arrays/objects without calling their conversion methods. This shared helper also validates issue assignees.

3. **P3: The parser byte limit rejects valid maximum-length descriptions.** `src/app.js:74` caps JSON at 32 KiB, while the contract permits a 10,000-character description. A valid JSON request whose description is 10,000 repeated `\u0061` escapes (60,034 request bytes, decoding to 10,000 ASCII a characters) returned **413 TOO_LARGE** before field validation. A normal JSON.stringify request with sufficient embedded control characters has the same expansion. Raise the bounded parser limit enough for the largest permitted payload including JSON escaping (for example, 128 KiB), or explicitly narrow the contract's supported byte size.

## Boundary and concurrency assessment

No concrete Host/Origin bypass found in the inspected code. Host is restricted to localhost/127.0.0.1; writes require the custom header, reject Sec-Fetch-Site cross-site, and match any provided Origin against the actual Host. Browser CORS is not enabled. Omitted Origin from local nonbrowser clients is consistent with the local demo boundary. No demand for production identity controls is made.

Membership authorization for writes, last-owner checks, automatic unassignment/version increments, issue number allocation, compare-and-swap updates, and event insertion all execute inside BEGIN IMMEDIATE transactions. That structure serializes competing writers and rolls back failed activity insertion with the mutation. No concrete data race or last-owner escape found by inspection.

## Limits

This challenge did not run multiprocess concurrency or restart tests; those belong to the separate Sol verification work. It did not review the frontend. It proves the HTTP edge cases above, but does not claim exhaustive security or concurrency coverage. Findings refer to the reviewed version; root may fix them afterward and record retest evidence separately.
