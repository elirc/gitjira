# Predict winners and unchanged rows

Exercise one: two browser tabs load issue version T. Tab A assigns sprint S1 and tab B assigns S2 using the same version. Predict the two statuses and final assignment. State why simply reading T before an unconditional update would leave a race even inside otherwise well-structured service code.

Exercise two: place the issue timestamp one minute ahead of the wall clock. Assign it with that exact expected timestamp. Calculate the next stored value and explain how a subsequent stale request is rejected. Contrast this with assigning Date.now without comparing the previous value.

Exercise three: complete an active sprint while another request assigns a previously unassigned issue to it. Enumerate the acceptable assignment outcomes and the final issue location. Identify why both paths need compatible transactional behavior; protecting completion alone cannot control an unrelated writer.

Exercise four: use a destination sprint in another project, then the source itself, then a completed destination. Predict which validation rejects each request and which durable rows remain unchanged. Separate project concealment from lifecycle conflict.

Exercise five: force repeated recognized serialization conflicts. Count the maximum transaction attempts and identify the final outward error. Then consider an unrelated programming exception: explain why retrying it under the same policy would hide defects or repeat work unnecessarily. Locate the exact error-code check before proposing a change.

## Source excerpt

From [apps/api/test/sprint.test.js](../apps/api/test/sprint.test.js).

```js
  it('rejects cross-project completion destinations without changing source state', async () => {
    const { ana, i1 } = await setup();
    const source = (await createSprint(ana, { name: 'Source' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: source.id, expectedUpdatedAt: i1.updatedAt });
    await request(app)
      .post(`/api/projects/GJ/sprints/${source.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    await makeProject(ana.auth, 'OTHER', 'Other project');
    const foreign = (
      await request(app)
        .post('/api/projects/OTHER/sprints')
        .set('Authorization', ana.auth)
        .send({ name: 'Foreign' })
    ).body.sprint;

    await request(app)
      .post(`/api/projects/GJ/sprints/${source.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: foreign.id })
      .expect(404);

    const sprints = await request(app)
      .get('/api/projects/GJ/sprints')
      .set('Authorization', ana.auth)
      .expect(200);
    expect(sprints.body.sprints.find((s) => s.id === source.id).state).toBe('ACTIVE');
    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${i1.number}/detail`)
      .set('Authorization', ana.auth)
      .expect(200);
    expect(detail.body.issue.sprintId).toBe(source.id);
  });

  it('allows only one concurrent completion to move unfinished issues', async () => {
    const { ana, i1 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    const complete = () =>
      request(app)
        .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
        .set('Authorization', ana.auth)
        .send({ moveUnfinishedTo: 'backlog' });
    const [r1, r2] = await Promise.all([complete(), complete()]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const winner = r1.status === 200 ? r1 : r2;
    expect(winner.body.movedCount).toBe(1);
    expect(winner.body.sprint.state).toBe('COMPLETED');
  });

  it('never strands a concurrent assignment in a sprint being completed', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt })
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
