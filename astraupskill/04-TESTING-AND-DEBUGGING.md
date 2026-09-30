# Test real competing transactions

The sprint suite creates fixtures through the API and exercises actual PostgreSQL transactions. The stale-token race sends two assignments with the same captured version and requires one success and one conflict. It inspects the winning sprint and verifies that the returned timestamp changed. The future-clock case protects strict advancement independently of scheduler timing.

The completion race sends two completion requests and requires a single winner with one moved issue. Another regression races assignment against completion and checks that the issue is ultimately in the backlog. Cross-project destination rejection checks both the source sprint's ACTIVE state and the issue's retained assignment after the error.

The nonmember test expects the service's intentional 404 and reads the issue afterward to prove the denied request changed neither sprint nor version. This is stronger than accepting any error status. Separate socket tests now await presence or join-error events instead of guessing that a short sleep was enough; clients close after each test even when an assertion fails.

The local helper creates and removes its own PostgreSQL cluster and streams command output into the recorded log. Resource-sensitive timeouts are supplied on the command line for this machine. Failed commands remain visible in campaign evidence. Inspect their actual assertions before deciding whether a failure concerns application behavior, test synchronization, or environment capacity.

## Source excerpt

From [apps/api/test/sprint.test.js](../apps/api/test/sprint.test.js).

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

  it('rejects assignment to a completed sprint', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i2.updatedAt })
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: 'backlog' })
      .expect(200);

    const rejected = await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });

    expect(rejected.status).toBe(409);
  });

  it('rejects cross-project completion destinations without changing source state', async () => {
    const { ana, i1 } = await setup();
    const source = (await createSprint(ana, { name: 'Source' })).body.sprint;
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
