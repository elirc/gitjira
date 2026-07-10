# Security model

> Written before the enforcement code — a permission matrix is a product
> decision, and code should enforce a decision, not improvise one.

## The golden rule

**The server is the security boundary. The UI is a courtesy.** The web app hides
buttons a user can't use (good UX), but every real decision is enforced
server-side, in one place (`packages/shared/src/policy.js`). Never trust the
client — an attacker doesn't use your UI.

## Two layers of authorization

Every protected request must pass **both**:

1. **Object-level** (can you touch THIS object?) — are you a member of the
   project this resource belongs to? Enforced at the data layer. Skipping this is
   an **IDOR** (Insecure Direct Object Reference): a logged-in user reaching
   another customer's data by guessing an id.
2. **Action-level** (may your ROLE do this?) — the permission matrix below,
   enforced by `can(role, action)`.

Both must pass. A VIEWER who is a member of a project (object-level ✓) still
can't delete an issue (action-level ✗).

## Permission matrix

Roles: **ADMIN** (project owner/manager), **MEMBER** (contributor), **VIEWER**
(read-only). This table is mirrored from `POLICY` in `packages/shared/src/policy.js`;
a test (`policy.test.js`) asserts the two match, so the doc and the code cannot
drift — change one without the other and CI fails.

| Action            | ADMIN | MEMBER | VIEWER |
| ----------------- | :---: | :----: | :----: |
| project:read      |   ✓   |   ✓    |   ✓    |
| project:update    |   ✓   |        |        |
| project:delete    |   ✓   |        |        |
| member:add        |   ✓   |        |        |
| member:remove     |   ✓   |        |        |
| issue:read        |   ✓   |   ✓    |   ✓    |
| issue:create      |   ✓   |   ✓    |        |
| issue:update      |   ✓   |   ✓    |        |
| issue:move        |   ✓   |   ✓    |        |
| issue:delete      |   ✓   |   ✓    |        |
| comment:read      |   ✓   |   ✓    |   ✓    |
| comment:create    |   ✓   |   ✓    |        |
| attachment:read   |   ✓   |   ✓    |   ✓    |
| attachment:upload |   ✓   |   ✓    |        |
| sprint:read       |   ✓   |   ✓    |   ✓    |
| sprint:manage     |   ✓   |   ✓    |        |

### Gap this matrix surfaced

Writing the matrix exposed a real gap: before Sprint 13, the code only gated
member management (`['ADMIN']`) and let **any member** do everything else — so a
**VIEWER could create and edit issues**, contradicting "read-only". The matrix
made the intended rule explicit, and routing every endpoint through `can()`
enforced it. This is why you write the matrix first: it turns "what the code
happens to do" into "what we decided it should do".

## Reporting

Found a vulnerability? Email security@gitjira.dev (placeholder). Do not open a
public issue. We aim to acknowledge within 48 hours.
