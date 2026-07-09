import {
  createIssue,
  listIssues,
  getIssue,
  updateIssue,
  deleteIssue,
} from '../services/issue.service.js';

export async function create(req, res) {
  const issue = await createIssue(req.params.key, req.user.id, req.body);
  res.status(201).json({ issue });
}

export async function list(req, res) {
  const { cursor, limit, type, assigneeId, columnId } = req.query;
  const result = await listIssues(req.params.key, req.user.id, {
    cursor,
    limit: parseLimit(limit),
    type,
    assigneeId,
    columnId,
  });
  res.json(result);
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// LEARN: query strings are untrusted input too — the zod body validation
// (sprint 02) never covered them. `Number('abc')` is NaN, which crashed the
// Prisma query (bug #29). Coerce to a positive integer, fall back to the
// default for anything invalid, and cap the maximum so a client can't ask
// for the whole table.
function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export async function getOne(req, res) {
  const issue = await getIssue(req.params.key, Number(req.params.number), req.user.id);
  res.json({ issue });
}

export async function update(req, res) {
  const issue = await updateIssue(req.params.key, Number(req.params.number), req.user.id, req.body);
  res.json({ issue });
}

export async function remove(req, res) {
  await deleteIssue(req.params.key, Number(req.params.number), req.user.id);
  res.status(204).end();
}
