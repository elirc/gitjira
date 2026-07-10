import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { createProjectWithIssues, buildUser } from '@gitjira/test-factories';

// LEARN (sprint 11): this suite is the receipt for two claims at once —
//   1. FACTORIES build a valid world in one call, with intent-revealing overrides.
//   2. transaction-ROLLBACK isolation actually isolates: the first test commits
//      (from its own point of view) a pile of data; the second test sees an
//      empty database, because the first test's transaction was rolled back.
// If isolation were broken, test 2 would see test 1's rows and fail. It doesn't.

describe('factories + rollback isolation', () => {
  it('creates a full project graph from one factory call', async () => {
    const { project, lead, columns, issues } = await createProjectWithIssues(prisma, { count: 5 });

    expect(project.key).toMatch(/^P\d+$/);
    expect(columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Done']);
    expect(issues).toHaveLength(5);
    // every issue landed in the first column, numbered 1..5
    expect(issues.map((i) => i.number)).toEqual([1, 2, 3, 4, 5]);
    expect(issues.every((i) => i.columnId === columns[0].id)).toBe(true);
    // the lead is a member with admin rights
    const members = await prisma.projectMember.findMany({ where: { projectId: project.id } });
    expect(members).toEqual([expect.objectContaining({ userId: lead.id, role: 'ADMIN' })]);
  });

  it('sees an EMPTY database — proof the previous test rolled back', async () => {
    // No beforeEach truncate ran here; the only reason this is empty is that the
    // previous test's transaction was never committed.
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.issue.count()).toBe(0);
  });

  it('overrides say what the test cares about; defaults fill the rest', async () => {
    const admin = buildUser({ email: 'boss@acme.test' });
    expect(admin.email).toBe('boss@acme.test'); // the one field this test asserts
    expect(admin.name).toMatch(/^User \d+$/); // irrelevant-but-valid default
    expect(admin.passwordHash).toBeTruthy();
  });
});
