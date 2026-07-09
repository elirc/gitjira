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
    limit: limit ? Number(limit) : undefined,
    type,
    assigneeId,
    columnId,
  });
  res.json(result);
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
