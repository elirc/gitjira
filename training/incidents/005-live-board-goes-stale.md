# INC-005: The live board stops updating after a while

**Severity:** SEV-3 (degraded realtime, with a workaround)
**Branch:** `training/incidents/005-live-board-goes-stale`
**Trigger:** support tickets, three in one morning, starting the day after web release `v1.5.0` (containing PR #170).

## What users report

- "The board stopped being live. I only see Ben's new issues after I refresh. It works right after I refresh, then stops a while later."
- "It's like a timer. I opened the board at 9:02 and it was live until about 9:17."
- "The avatars are wrong. It shows Ana as 'here' when she closed her laptop an hour ago. And I don't appear in _her_ avatars even though my tab is open." (Two people on the same board.)
- "Notifications still show up in the bell." (The bell polls every 30 s.)

## Evidence the on-call collected

Browser DevTools → Network → WS, on a tab opened at 09:02:10:

```
09:02:10  ↑ 40{"token":"eyJhbGciOi…(exp 09:17:10)"}      (Socket.IO connect)
09:02:10  ↓ 40{"sid":"Qm3…"}
09:02:10  ↑ 42["join-project",{"projectId":"ckprj_gj"}]
09:02:11  ↓ 42["presence",[{"id":"u_ana"},{"id":"u_ben"}]]
09:05:40  ↓ 42["activity",{"kind":"issue.created",…}]
… (live: activity frames arrive)
09:17:31  (REST) GET /api/me/notifications → 401 ; POST /api/auth/refresh → 200 ; GET /api/me/notifications → 200
09:17:31  ↑ 41                                          (client disconnect)
09:17:31  ↑ 40{"token":"eyJhbGciOi…(exp 09:32:31)"}
09:17:31  ↓ 40{"sid":"Zt8…"}
… (no more activity frames, although teammates keep creating issues)
```

API logs for the same user:

```
09:17:31.604 INFO socket disconnected userId=u_carl socketId=Qm3…
09:17:31.611 INFO socket connected    userId=u_carl socketId=Zt8…
```

No errors anywhere. The socket is connected, and the server shows 1 socket for `u_carl`.

## The suspect PR (#170, merged Wed, CI green)

> **fix(web): give the socket the fresh token after a silent refresh.** The socket authenticates once, at handshake, with the access token that existed when `getSocket()` first ran. After that token expires (15 min), any reconnect (wifi blip, laptop sleep, API deploy) is rejected by the server's auth middleware ("Invalid token"), and live updates stop until a full page reload. `socket.js` already had `reconnectSocket()` for exactly this, but nothing called it.

```diff
--- a/apps/web/src/lib/api.js
+++ b/apps/web/src/lib/api.js
 import { apiPath } from '@gitjira/shared';
+import { reconnectSocket } from './socket.js';
@@ async function refreshSession() {
       const session = await res.json();
       accessToken = session.accessToken;
+      // The socket authenticated with the OLD access token at handshake time.
+      // Once that token expires, any reconnect (wifi blip, API deploy) is
+      // rejected by the server's auth middleware and live updates silently
+      // stop. Hand the socket the fresh token now, while it is still valid.
+      reconnectSocket();
       return session;
```

## Your tasks

1. The PR's bug report is correct for HEAD. Confirm it: find the code path where an expired handshake token kills realtime for good at HEAD (`socket.js`, `socket-server.js:23-33`). What does the Socket.IO client do after a middleware `connect_error`?
2. Explain why, _with_ the PR, the board goes stale at exactly about 15 minutes. Name the server-side state the new connection lacks, and where the client was supposed to re-establish it.
3. The PR made a latent bug deterministic. Which other everyday event causes the same staleness at HEAD, with no token refresh involved? (Think about `fly.toml` and review R9.)
4. Explain both presence symptoms: Ana shown after she left, and Carl missing from Ana's avatars.
5. Fix it so realtime survives any reconnect, whatever the cause. Keep the good part of the PR. Say where the fix lives (client, server, or both) and why.
6. Write a test that reproduces "reconnect loses the room" at the API level with `socket.io-client`, in the style of `apps/api/test/socket.test.js`.
