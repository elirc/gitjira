# GitJira demo script (v0.1.0)

A 3-minute walkthrough of the MVP. Assumes `docker compose up -d`, migrations applied,
and `npm run db:seed -w @gitjira/api` (demo login: `ana@gitjira.dev` / `demo-password-1`).

1. `npm run dev` → open http://localhost:5173, log in as Ana.
2. **Projects** → open **GJ (GitJira)**. See the board with To Do / In Progress / Done.
3. **Create an issue** ("Ship v0.1.0", type Story, priority High). It appears in To Do.
4. **Drag it** to In Progress. It moves instantly and stays after a refresh.
5. **Click the card** → the detail panel opens; note the URL is now `?selected=GJ-…`.
   Copy that URL, open it in a new tab — you land straight on the issue.
6. In the panel: **change priority**, **edit the description**, **add a comment**.
   Watch the **Activity** trail record each action.
7. **Add a sub-task**; the progress bar reflects done/total.
8. Visit a bad URL (e.g. `/nope`) → the 404 page, not a blank screen.

That's the MVP: auth → projects → board → issue detail → collaboration.
