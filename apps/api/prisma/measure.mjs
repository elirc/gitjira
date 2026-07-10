// Baseline measurement harness (sprint 12). Runs the REAL service code against
// the scaled perf DB through a query-logging client (installed via the sprint-11
// test seam __setActiveClient), so we count actual queries + time them.
process.env.DATABASE_URL = 'postgresql://gitjira:gitjira_dev@localhost:5432/gitjira_perf';
process.env.JWT_SECRET = 'perf';
process.env.LOG_LEVEL = 'silent';
process.env.DISABLE_QUEUE = '1';

import { PrismaClient } from '@prisma/client';
import { __setActiveClient } from '../src/lib/prisma.js';
import * as projectSvc from '../src/services/project.service.js';
import * as issueSvc from '../src/services/issue.service.js';

const client = new PrismaClient({ log: [{ level: 'query', emit: 'event' }] });
let qcount = 0;
let qms = 0;
const seen = [];
client.$on('query', (e) => {
  qcount++;
  qms += Number(e.duration);
  seen.push(e.query);
});
__setActiveClient(client);

function reset() {
  qcount = 0;
  qms = 0;
  seen.length = 0;
}

async function measure(name, fn, runs = 5) {
  await fn(); // warm
  reset();
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) await fn();
  const wall = (performance.now() - t0) / runs;
  console.log(
    `${name.padEnd(28)} queries/req=${(qcount / runs).toFixed(0).padStart(4)}  db_ms/req=${(qms / runs).toFixed(1).padStart(7)}  wall_ms/req=${wall.toFixed(1).padStart(7)}`
  );
}

async function main() {
  // pick a real project + a member of it
  const project = await client.project.findFirst({ where: { key: 'SCL0' } });
  const member = await client.projectMember.findFirst({ where: { projectId: project.id } });
  const userId = member.userId;
  const anyIssue = await client.issue.findFirst({ where: { projectId: project.id } });

  console.log(
    `\nBaseline @ scale (project ${project.key}, ${await client.issue.count()} issues total)\n`
  );

  await measure('GET /projects/:key (board)', () => projectSvc.getProjectByKey('SCL0', userId));
  await measure('GET issues (list, limit 50)', () =>
    issueSvc.listIssues('SCL0', userId, { limit: 50 })
  );
  await measure('GET issue detail', () => issueSvc.getIssueDetail('SCL0', anyIssue.number, userId));
  await measure(
    'GET project members',
    () => projectSvc.listMembers?.('SCL0', userId) ?? Promise.resolve()
  );

  console.log('');
  await client.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
