import {
  createProject,
  listProjectsForUser,
  getProjectByKey,
  addMember,
  removeMember,
} from '../services/project.service.js';

export async function create(req, res) {
  const project = await createProject(req.body, req.user.id);
  res.status(201).json({ project });
}

export async function list(req, res) {
  const projects = await listProjectsForUser(req.user.id);
  res.json({ projects });
}

export async function getOne(req, res) {
  const project = await getProjectByKey(req.params.key, req.user.id);
  res.json({ project });
}

export async function addProjectMember(req, res) {
  const member = await addMember(req.params.id, req.user.id, req.body);
  res.status(201).json({ member });
}

export async function removeProjectMember(req, res) {
  await removeMember(req.params.id, req.user.id, req.params.userId);
  res.status(204).end();
}
