import { searchIssues } from '../services/search.service.js';
import {
  createSavedFilter,
  listSavedFilters,
  deleteSavedFilter,
} from '../services/saved-filter.service.js';

export async function search(req, res) {
  const { jql, text, cursor, limit } = req.query;
  const result = await searchIssues(req.params.key, req.user.id, {
    jql,
    text,
    cursor,
    limit: limit ? Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100) : 50,
  });
  res.json(result);
}

export async function saveFilter(req, res) {
  const filter = await createSavedFilter(req.user.id, req.body);
  res.status(201).json({ filter });
}

export async function listFilters(req, res) {
  res.json({ filters: await listSavedFilters(req.user.id) });
}

export async function removeFilter(req, res) {
  await deleteSavedFilter(req.user.id, req.params.id);
  res.status(204).end();
}
