# CR-21: live notification bell

**From:** PM, Collaboration
**Request:** "When someone assigns me an issue or @mentions me, the bell should light up right away, not up to 30 seconds later. If I have GitJira open in three tabs, all three should show the same unread count, and 'Mark all read' in one tab should clear it in the others."

**Your job:** write down where this belongs **before** any agent writes code. The reference placement is in `training/_answers/navigation-change-request.md`. Open it only after you've written yours.

## What you have (committed `main`)

- `apps/api/src/jobs/notification-handler.js` creates `Notification` rows **in the worker process** (`apps/worker/src/index.js`).
- `apps/api/src/realtime/socket-server.js` runs Socket.IO **inside the API process**. Rooms are per project (`project:<id>`). There's no adapter, and fly.toml runs 2 or more API machines.
- `apps/web/src/lib/hooks.js:236-244`: `useNotifications` polls `/me/notifications` every 30 s. Read its comment, then grep for proof that it's true.
- `apps/web/src/components/NotificationBell.jsx` and `notification.service.js` (`markAllRead`, `markRead`).

## Write your placement (one page max)

1. **Who emits, and from which process?** The row is written in the worker. How does a browser connected to API machine B find out? List at least two mechanisms, and pick one.
2. **Addressing.** Which room or channel identifies "this user's tabs, on any machine"? Where and when does a socket join it? What authorization does that need?
3. **Event contract.** Event name, payload fields, and whether the payload carries data or is only a hint. Justify it using how `useLiveProject` already handles project events.
4. **Timing.** Emit before or after the notification row commits? What if the job is retried? (See `apprenticeship/curriculum/02-idempotency.md`.)
5. **Mark-read sync across tabs.** Which endpoint emits, and to whom?
6. **Files you'll touch, and files you must not touch** (for example, anything under the user's uncommitted WIP).
7. **Data changes.** Does this need a migration? Is there an index to add for `unreadCount` at scale (see `schema.prisma` `Notification`)?
8. **Tests.** Name each test file and what it proves. Which of your claims can't be proven by the rolled-back-transaction harness (`apps/api/test/tx.js`)?
9. **Failure behavior.** What happens if Redis is down, and what is the user's fallback? Keep the 30 s poll or remove it?
10. **Rollout.** Old SPA bundles in open tabs don't know the new event. Is that safe?

Only after this is written: hand the placement to an implementer agent, and review its diff against your list (`training/agentic/VERIFY_CHECKLIST.md`).
