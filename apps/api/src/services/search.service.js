import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { parseJql, compileJql, JqlSyntaxError } from '@gitjira/shared/jql';
import { notFound, ApiError } from '../lib/errors.js';
import { requireMembership } from './project.service.js';

// LEARN: this is where the three JQL steps (parse → compile) meet the database.
// The parser/compiler live in packages/shared (client and server agree on the
// grammar); this service resolves request context ("me" → the caller) and runs
// the resulting query.
export async function searchIssues(projectKey, actorId, { jql, text, cursor, limit = 50 }) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);

  // Compile the JQL (if any) into a Prisma where fragment.
  let jqlWhere = {};
  let textTerm = text;
  if (jql) {
    try {
      const ast = parseJql(jql);
      jqlWhere = compileJql(ast, { userId: actorId });
      // The compiler emits a { __text__ } sentinel for free-text comparisons;
      // pull it out so we handle it via full-text search below.
      if (jqlWhere.__text__) {
        textTerm = jqlWhere.__text__;
        delete jqlWhere.__text__;
      }
    } catch (e) {
      if (e instanceof JqlSyntaxError) {
        // WHY: translate the parser's error into our API error contract with a
        // position, so the client can underline exactly where the query broke.
        throw new ApiError('VALIDATION_FAILED', `Invalid query: ${e.message}`, {
          position: e.position,
        });
      }
      throw e;
    }
  }

  const where = { projectId: project.id, ...jqlWhere };

  // Free-text search: restrict to issue ids whose searchVector matches.
  if (textTerm) {
    const ids = await fullTextIssueIds(project.id, textTerm);
    where.id = { in: ids };
  }

  const rows = await prisma.issue.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      priority: true,
      columnId: true,
      position: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    issues: page.map((i) => ({ ...i, key: `${project.key}-${i.number}` })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

// Run the full-text query and return matching issue ids, ranked.
async function fullTextIssueIds(projectId, term) {
  // LEARN: PARAMETERIZED query (review finding on PR #57). The `${...}` in a
  // Prisma.sql tagged template are NOT string interpolation — Prisma sends them
  // to Postgres as bound parameters, separate from the query text, so a value
  // like O'Brien or "'; DROP TABLE" is treated as data and can never become
  // SQL. This is the only safe way to put user input in a raw query. The rule
  // is absolute: never concatenate user input into SQL.
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT id FROM "Issue"
      WHERE "projectId" = ${projectId}
        AND "searchVector" @@ websearch_to_tsquery('english', ${term})
      ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${term})) DESC
      LIMIT 200`
  );
  return rows.map((r) => r.id);
}
