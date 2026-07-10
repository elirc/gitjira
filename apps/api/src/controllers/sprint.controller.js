import * as sprints from '../services/sprint.service.js';

export async function list(req, res) {
  res.json({ sprints: await sprints.listSprints(req.params.key, req.user.id) });
}
export async function create(req, res) {
  const sprint = await sprints.createSprint(req.params.key, req.user.id, req.body);
  res.status(201).json({ sprint });
}
export async function start(req, res) {
  const sprint = await sprints.startSprint(req.params.key, req.user.id, req.params.id);
  res.json({ sprint });
}
export async function complete(req, res) {
  const result = await sprints.completeSprint(req.params.key, req.user.id, req.params.id, req.body);
  res.json(result);
}
export async function assignIssue(req, res) {
  const issue = await sprints.assignIssueToSprint(
    req.params.key,
    req.user.id,
    Number(req.params.number),
    req.body.sprintId ?? null
  );
  res.json({ issue });
}
export async function report(req, res) {
  res.json(await sprints.sprintReport(req.params.key, req.user.id, req.params.id));
}
