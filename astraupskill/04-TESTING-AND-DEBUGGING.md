# Test real competing transactions

The sprint suite creates fixtures through the API and exercises actual PostgreSQL transactions. The stale-token race sends two assignments with the same captured version and requires one success and one conflict. It inspects the winning sprint and verifies that the returned timestamp changed. The future-clock case protects strict advancement independently of scheduler timing.

The completion race sends two completion requests and requires a single winner with one moved issue. Another regression races assignment against completion and checks that the issue is ultimately in the backlog. Cross-project destination rejection checks both the source sprint's ACTIVE state and the issue's retained assignment after the error.

The nonmember test expects the service's intentional 404 and reads the issue afterward to prove the denied request changed neither sprint nor version. This is stronger than accepting any error status. Separate socket tests now await presence or join-error events instead of guessing that a short sleep was enough; clients close after each test even when an assertion fails.

The local helper creates and removes its own PostgreSQL cluster and streams command output into the recorded log. Resource-sensitive timeouts were supplied on the command line for the recording machine (see the `command` arrays in `evidence/*.json`). Failed attempts were kept in the original campaign records, which are not in this repository; only the accepted runs are in `evidence/`. Inspect their actual assertions before deciding whether a failure concerns application behavior, test synchronization, or environment capacity.

## Source excerpt

From [apps/api/test/sprint.test.js](../apps/api/test/sprint.test.js), lines 114–153: the shared-token race and the nonmember denial.

```js
  it('allows exactly one assignment with a shared stale-write token', async () => {
    const { ana, i1 } = await setup();
    const listed = await request(app)
      .get('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .expect(200);
    const backlogIssue = listed.body.issues.find((issue) => issue.id === i1.id);
    expect(backlogIssue.updatedAt).toBe(i1.updatedAt);
    const s1 = (await createSprint(ana, { name: 'S1' })).body.sprint;
    const s2 = (await createSprint(ana, { name: 'S2' })).body.sprint;

    const assignment = (sprintId) =>
      request(app)
        .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
        .set('Authorization', ana.auth)
        .send({ sprintId, expectedUpdatedAt: backlogIssue.updatedAt });
    const [r1, r2] = await Promise.all([assignment(s1.id), assignment(s2.id)]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const winner = r1.status === 200 ? r1 : r2;
    expect(winner.body.issue.updatedAt).not.toBe(i1.updatedAt);
    expect([s1.id, s2.id]).toContain(winner.body.issue.sprintId);
  });

  it('denies a nonmember sprint assignment', async () => {
    const { ana, i1 } = await setup();
    const outsider = await makeUser('sprint-outsider@t.dev');
    const sprint = (await createSprint(ana)).body.sprint;

    const denied = await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', outsider.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });

    // Nonmembers receive the existing concealed-project response.
    expect(denied.status).toBe(404);
    const stored = await __realClient.issue.findUnique({ where: { id: i1.id } });
    expect(stored.sprintId).toBeNull();
    expect(stored.updatedAt.toISOString()).toBe(i1.updatedAt);
  });
```

## Which test proves which sentence

| Claim in this chapter | Test in `apps/api/test/sprint.test.js` | Lines |
| --- | --- | --- |
| strict advancement with a future clock | `strictly advances the assignment token when the wall clock has not advanced` | 96–112 |
| shared stale token → one 200, one 409 | `allows exactly one assignment with a shared stale-write token` | 114–136 |
| nonmember → 404, no mutation | `denies a nonmember sprint assignment` | 138–153 |
| no assignment into a completed sprint | `rejects assignment to a completed sprint` | 155–179 |
| cross-project destination leaves source untouched | `rejects cross-project completion destinations without changing source state` | 181–217 |
| one winner among concurrent completions | `allows only one concurrent completion to move unfinished issues` | 219–242 |
| assignment racing completion never strands | `never strands a concurrent assignment in a sprint being completed` | 244–275 |

The browser side has one component test, `apps/web/test/backlog-stale-assignment.test.jsx`. It answers the PATCH with a mocked 409 and asserts two things: the alert text (lines 67–69) and the exact request body `{ sprintId, expectedUpdatedAt }` (line 70).

## Debugging exercises (read-only)

1. **Goal:** reconcile the course's test count with the evidence.
   **Check:** `grep -c "^  it(" apps/api/test/sprint.test.js apps/api/test/issue.test.js` prints 13 and 4. That makes 17, the same as the `Tests  17 passed` line in `astraupskill/evidence/astra-gitjira-list-sprint-tests-r6.log`.
2. **Goal:** explain why the nonmember test reads through `__realClient` and not through the API.
   **Check:** line 150 queries `__realClient.issue.findUnique` directly. The outsider's API reads would return 404 just like the write did. Reading the row directly is the only way to show that neither `sprintId` nor `updatedAt` changed (lines 151–152).
3. **Goal:** find the deliberately long waits in the web test and say what they protect against.
   **Check:** `{ timeout: 30000 }` at lines 64 and 67. [VERIFICATION](VERIFICATION.md) explains them: Testing Library's one-second default flaked on a slow host. The assertions themselves were not weakened.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
