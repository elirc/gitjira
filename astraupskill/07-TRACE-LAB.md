# Interleave assignment and completion

Draw one column for assignment and another for completion. Begin with an ACTIVE sprint containing one unfinished issue and a second issue in the backlog. Both callers are authorized project members. Record the point at which each transaction reads the sprint and the issue versions.

First let assignment commit before completion finishes its view of the work. Completion must either include the newly assigned unfinished issue in its move or encounter a serialization conflict and retry against the committed state. After successful completion, both unfinished issues belong to the chosen destination.

Now let completion commit first. Assignment cannot successfully leave its issue on the completed sprint. On retry it observes COMPLETED and rejects; a conflicting transaction can also exhaust retries and return a conflict. The regression allows the appropriate assignment status but always reads the final issue and requires the backlog result for its fixture.

Finally race two completions. Both may initially read ACTIVE, but only one can complete the transition. The loser cannot report a second successful move. Compare the state-qualified update, the surrounding isolation policy, and the final response fields to explain this result.

Use the actual test requests below to annotate your timeline. Avoid inserting arbitrary sleeps to force the desired winner; the invariant must hold regardless of which request reaches the database first. If a failure occurs, retain response bodies and inspect committed rows before changing timeouts or weakening assertions.

## Source excerpt

From [apps/api/test/sprint.test.js](../apps/api/test/sprint.test.js).

```js
  it('never strands a concurrent assignment in a sprint being completed', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt })
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    const [completed, assigned] = await Promise.all([
      request(app)
        .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
        .set('Authorization', ana.auth)
        .send({ moveUnfinishedTo: 'backlog' }),
      request(app)
        .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
        .set('Authorization', ana.auth)
        .send({ sprintId: sprint.id, expectedUpdatedAt: i2.updatedAt }),
    ]);

    expect(completed.status).toBe(200);
    expect([200, 409]).toContain(assigned.status);
    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${i2.number}/detail`)
      .set('Authorization', ana.auth)
      .expect(200);
    expect(detail.body.issue.sprintId ?? null).toBeNull();
  });

  it('concurrent starts yield exactly one 200 and one 409, never a 500', async () => {
    const ana = await makeUser('spc@t.dev');
    await makeProject(ana.auth, 'GJ');
    const mk = (body) =>
      request(app).post('/api/projects/GJ/issues').set('Authorization', ana.auth).send(body);
    const i1 = (await mk({ title: 'a' })).body.issue;
    const i2 = (await mk({ title: 'b' })).body.issue;
    const s1 = (await createSprint({ auth: ana.auth }, { name: 'S1' })).body.sprint;
    const s2 = (await createSprint({ auth: ana.auth }, { name: 'S2' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: s1.id });
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: s2.id });

    // fire both starts at once
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/projects/GJ/sprints/${s1.id}/start`).set('Authorization', ana.auth),
      request(app).post(`/api/projects/GJ/sprints/${s2.id}/start`).set('Authorization', ana.auth),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses, JSON.stringify([r1.body, r2.body])).toEqual([200, 409]);
  });

  it('completing a sprint moves unfinished issues atomically (none stranded)', async () => {
    const ana = await makeUser('spa@t.dev');
    await makeProject(ana.auth, 'GJ');
    const mk = (body) =>
      request(app).post('/api/projects/GJ/issues').set('Authorization', ana.auth).send(body);
    const i1 = (await mk({ title: 'x' })).body.issue;
    const sprint = (await createSprint({ auth: ana.auth }, { name: 'S1' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
