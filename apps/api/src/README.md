# API structure

Every request flows through three layers, each with one job:

| Layer | Job | Must NOT do |
|---|---|---|
| `routes/` | Map URLs + HTTP verbs to controllers | Contain logic |
| `controllers/` | Translate HTTP ↔ domain: parse input, call a service, shape the response | Contain business rules or touch the database |
| `services/` | Business logic. Plain functions, no `req`/`res` in sight | Know anything about HTTP |

Why bother for a health endpoint? Because the second endpoint copies the
shape of the first. Establish the pattern while it's trivial and every
future feature has an obvious home — "where does this code go?" should
never be a debate.

`middleware/` holds cross-cutting request concerns (logging, errors, and
later: auth, validation).
