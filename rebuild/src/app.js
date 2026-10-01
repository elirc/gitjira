import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase, transaction } from './database.js';

const statuses = ['backlog', 'todo', 'in_progress', 'done'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const roles = ['owner', 'editor', 'viewer'];
const issueSelect = `SELECT i.id, i.project_id AS projectId, i.number, p.key || '-' || i.number AS key,
  i.title, i.description, i.status, i.priority, i.assignee_id AS assigneeId,
  a.name AS assigneeName, a.initials AS assigneeInitials, a.color AS assigneeColor,
  c.name AS creatorName, i.version, i.created_at AS createdAt, i.updated_at AS updatedAt
  FROM issues i JOIN projects p ON p.id=i.project_id JOIN users c ON c.id=i.creator_id
  LEFT JOIN users a ON a.id=i.assignee_id`;

class ApiError extends Error {
  constructor(status, code, message, current) {
    super(message);
    Object.assign(this, { status, code, current });
  }
}
const fail = (status, code, message, current) => { throw new ApiError(status, code, message, current); };
const hash = (token) => createHash('sha256').update(token).digest('hex');
const now = () => new Date().toISOString();
function id(value, name = 'ID') {
  // Only number/string primitives may reach coercion: calling String() on an
  // arbitrary JSON object invokes its own toString (journal/reviews/04 §2).
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
    fail(400, 'VALIDATION', `${name} must be a positive integer.`);
  return Number(value);
}
function object(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'VALIDATION', 'A JSON object is required.');
  if (Object.keys(body).some((key) => !allowed.includes(key))) fail(400, 'VALIDATION', 'The request contains an unsupported field.');
}
function text(value, name, max, required = false) {
  // U+0000 is rejected because the SQLite path truncates text at a NUL, so the
  // stored value would not round-trip what was accepted (journal/reviews/04 §1).
  if (typeof value !== 'string' || value.includes('\u0000') || value.length > max || (required && !value.trim()))
    fail(400, 'VALIDATION', `${name} must be ${required ? 'non-empty text' : 'text'} up to ${max} characters.`);
  return value.trim();
}
function choice(value, values, name) {
  if (!values.includes(value)) fail(400, 'VALIDATION', `Invalid ${name}.`);
  return value;
}
function version(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, 'VALIDATION', 'A positive integer version is required.');
  return value;
}

export function createApp({ dbPath = ':memory:', logger = console } = {}) {
  const db = openDatabase(dbPath);
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    // Loopback Host allowlist prevents DNS rebinding into passwordless demo accounts.
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(req.headers.host || ''))
      return res.status(403).json({ error: 'Use the loopback address shown by the server.', code: 'HOST_DENIED' });
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-GitJira-Request') !== '1' || req.get('Sec-Fetch-Site') === 'cross-site')
        return res.status(403).json({ error: 'Same-origin request header required.', code: 'ORIGIN_DENIED' });
      if (req.get('Origin') && req.get('Origin') !== `http://${req.headers.host}`)
        return res.status(403).json({ error: 'Cross-origin writes are not allowed.', code: 'ORIGIN_DENIED' });
      if (req.headers['content-length'] && Number(req.headers['content-length']) > 0 && !req.is('application/json'))
        return res.status(415).json({ error: 'Use application/json.', code: 'CONTENT_TYPE' });
    }
    next();
  });
  // JSON escaping can use six bytes per character; preserve the documented text limits.
  app.use(express.json({ limit: '128kb', strict: true }));

  const getUser = (userId) => db.prepare('SELECT id,name,initials,color FROM users WHERE id=?').get(userId);
  const tokenFrom = (req) => {
    const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith('gitjira_session='));
    const token = cookie?.slice('gitjira_session='.length);
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  };
  // Authorization helper. Called inside the same transaction as each write, so
  // a concurrent membership revocation cannot land between check and mutation.
  // A nonmember gets 404, not 403: the response must not confirm the resource
  // exists in a project the caller cannot read.
  const member = (projectId, userId, write = false, owner = false) => {
    const found = db.prepare('SELECT role FROM memberships WHERE project_id=? AND user_id=?').get(projectId, userId);
    if (!found) fail(404, 'NOT_FOUND', 'Project not found.');
    if ((write && found.role === 'viewer') || (owner && found.role !== 'owner'))
      fail(403, 'FORBIDDEN', owner ? 'Only project owners can manage members.' : 'Viewers have read-only access.');
    return found.role;
  };
  const getIssue = (issueId, userId, write = false) => {
    const issue = db.prepare(`${issueSelect} WHERE i.id=? AND i.archived_at IS NULL`).get(issueId);
    if (!issue) fail(404, 'NOT_FOUND', 'Issue not found.');
    member(issue.projectId, userId, write);
    return issue;
  };
  const event = (projectId, issueId, actorId, action, detail) => db.prepare(
    'INSERT INTO activity(project_id,issue_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?)'
  ).run(projectId, issueId, actorId, action, detail, now());
  const getMembers = (projectId) => db.prepare(`SELECT u.id,u.name,u.initials,u.color,m.role FROM memberships m
    JOIN users u ON u.id=m.user_id WHERE m.project_id=? ORDER BY u.name`).all(projectId);
  const projectFor = (projectId, userId) => db.prepare(`SELECT p.id,p.key,p.name,p.description,m.role,
    (SELECT count(*) FROM issues i WHERE i.project_id=p.id AND i.archived_at IS NULL) AS issueCount
    FROM projects p JOIN memberships m ON m.project_id=p.id WHERE p.id=? AND m.user_id=?`).get(projectId, userId);
  const assignee = (value, projectId) => {
    if (value === null) return null;
    const userId = id(value, 'Assignee');
    if (!db.prepare('SELECT 1 FROM memberships WHERE project_id=? AND user_id=?').get(projectId, userId))
      fail(400, 'VALIDATION', 'The assignee must be a member of this project.');
    return userId;
  };
  const issueFields = (body, projectId, previous) => ({
    title: body.title === undefined && previous ? previous.title : text(body.title, 'Title', 180, true),
    description: body.description === undefined ? (previous?.description ?? '') : text(body.description, 'Description', 10000),
    status: body.status === undefined ? (previous?.status ?? 'todo') : choice(body.status, statuses, 'status'),
    priority: body.priority === undefined ? (previous?.priority ?? 'medium') : choice(body.priority, priorities, 'priority'),
    assigneeId: body.assigneeId === undefined ? (previous?.assigneeId ?? null) : assignee(body.assigneeId, projectId),
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/demo-users', (req, res) => res.json({ users: db.prepare('SELECT id,name,initials,color FROM users ORDER BY id').all() }));
  app.post('/api/session', (req, res) => {
    object(req.body, ['userId']);
    const user = getUser(id(req.body.userId, 'User'));
    if (!user) fail(400, 'VALIDATION', 'Choose one of the demo accounts.');
    const token = randomBytes(32).toString('hex');
    transaction(db, () => {
      const old = tokenFrom(req);
      if (old) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(old));
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
      db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), user.id, Date.now() + 7 * 86400000);
    });
    res.cookie('gitjira_session', token, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 86400000, path: '/' });
    res.json({ user });
  });
  app.use('/api', (req, res, next) => {
    const token = tokenFrom(req);
    const session = token && db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), Date.now());
    if (!session) return res.status(401).json({ error: 'Choose a demo account to continue.', code: 'UNAUTHENTICATED' });
    req.user = getUser(session.user_id);
    next();
  });
  app.get('/api/session', (req, res) => res.json({ user: req.user }));
  app.delete('/api/session', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(tokenFrom(req)));
    res.clearCookie('gitjira_session', { path: '/', httpOnly: true, sameSite: 'strict' });
    res.status(204).end();
  });
  app.get('/api/projects', (req, res) => {
    const projects = db.prepare(`SELECT p.id,p.key,p.name,p.description,m.role,
      (SELECT count(*) FROM issues i WHERE i.project_id=p.id AND i.archived_at IS NULL) AS issueCount
      FROM projects p JOIN memberships m ON m.project_id=p.id WHERE m.user_id=? ORDER BY p.id`).all(req.user.id);
    res.json({ projects });
  });
  app.post('/api/projects', (req, res) => {
    object(req.body, ['key', 'name', 'description']);
    const key = text(req.body.key, 'Key', 8, true);
    if (!/^[A-Z][A-Z0-9]{1,7}$/.test(key)) fail(400, 'VALIDATION', 'Key must be 2–8 uppercase letters/digits, starting with a letter.');
    const name = text(req.body.name, 'Name', 80, true);
    const description = req.body.description === undefined ? '' : text(req.body.description, 'Description', 1000);
    const project = transaction(db, () => {
      if (db.prepare('SELECT 1 FROM projects WHERE key=?').get(key)) fail(409, 'KEY_TAKEN', 'That project key is already in use.');
      const result = db.prepare('INSERT INTO projects(key,name,description,created_at) VALUES(?,?,?,?)').run(key, name, description, now());
      const projectId = Number(result.lastInsertRowid);
      db.prepare("INSERT INTO memberships VALUES(?,?,'owner')").run(projectId, req.user.id);
      event(projectId, null, req.user.id, 'project_created', 'Created this project');
      return projectFor(projectId, req.user.id);
    });
    res.status(201).json({ project });
  });
  app.get('/api/projects/:id/members', (req, res) => {
    const projectId = id(req.params.id);
    member(projectId, req.user.id);
    res.json({ members: getMembers(projectId) });
  });
  function guardLastOwner(projectId, userId, nextRole) {
    const previous = db.prepare('SELECT role FROM memberships WHERE project_id=? AND user_id=?').get(projectId, userId);
    if (previous?.role === 'owner' && nextRole !== 'owner' && db.prepare("SELECT count(*) AS n FROM memberships WHERE project_id=? AND role='owner'").get(projectId).n === 1)
      fail(409, 'LAST_OWNER', 'Keep at least one project owner.');
    return previous;
  }
  app.put('/api/projects/:id/members/:userId', (req, res) => {
    const projectId = id(req.params.id), userId = id(req.params.userId);
    object(req.body, ['role']);
    const role = choice(req.body.role, roles, 'role');
    const members = transaction(db, () => {
      member(projectId, req.user.id, false, true);
      const user = getUser(userId);
      if (!user) fail(400, 'VALIDATION', 'Unknown demo account.');
      const previous = guardLastOwner(projectId, userId, role);
      db.prepare('INSERT INTO memberships VALUES(?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role').run(projectId, userId, role);
      event(projectId, null, req.user.id, previous ? 'member_updated' : 'member_added', `${user.name}: ${previous ? previous.role + ' → ' : ''}${role}`);
      return getMembers(projectId);
    });
    res.json({ members });
  });
  app.delete('/api/projects/:id/members/:userId', (req, res) => {
    const projectId = id(req.params.id), userId = id(req.params.userId);
    const members = transaction(db, () => {
      member(projectId, req.user.id, false, true);
      const previous = guardLastOwner(projectId, userId, null);
      if (!previous) fail(404, 'NOT_FOUND', 'Member not found.');
      const assigned = db.prepare('SELECT id FROM issues WHERE project_id=? AND assignee_id=? AND archived_at IS NULL').all(projectId, userId);
      db.prepare('UPDATE issues SET assignee_id=NULL,version=version+1,updated_at=? WHERE project_id=? AND assignee_id=? AND archived_at IS NULL').run(now(), projectId, userId);
      for (const issue of assigned) event(projectId, issue.id, req.user.id, 'updated', 'Unassigned because the assignee left this project');
      db.prepare('DELETE FROM memberships WHERE project_id=? AND user_id=?').run(projectId, userId);
      event(projectId, null, req.user.id, 'member_removed', `Removed ${getUser(userId).name}`);
      return getMembers(projectId);
    });
    res.json({ members });
  });
  app.get('/api/projects/:id/issues', (req, res) => {
    const projectId = id(req.params.id);
    member(projectId, req.user.id);
    const clauses = ['i.project_id=?', 'i.archived_at IS NULL'], args = [projectId];
    if (req.query.q !== undefined && req.query.q !== '') {
      const query = text(req.query.q, 'Search', 200).toLowerCase();
      clauses.push("(instr(lower(i.title),?)>0 OR instr(lower(i.description),?)>0 OR instr(lower(p.key || '-' || i.number),?)>0)");
      args.push(query, query, query);
    }
    if (req.query.status !== undefined && req.query.status !== '') {
      clauses.push('i.status=?'); args.push(choice(req.query.status, statuses, 'status'));
    }
    if (req.query.priority !== undefined && req.query.priority !== '') {
      clauses.push('i.priority=?'); args.push(choice(req.query.priority, priorities, 'priority'));
    }
    if (req.query.assigneeId !== undefined && req.query.assigneeId !== '') {
      if (req.query.assigneeId === 'unassigned') clauses.push('i.assignee_id IS NULL');
      else { clauses.push('i.assignee_id=?'); args.push(id(req.query.assigneeId, 'Assignee')); }
    }
    res.json({ issues: db.prepare(`${issueSelect} WHERE ${clauses.join(' AND ')} ORDER BY i.number DESC`).all(...args) });
  });
  app.post('/api/projects/:id/issues', (req, res) => {
    const projectId = id(req.params.id);
    object(req.body, ['title', 'description', 'status', 'priority', 'assigneeId']);
    const issue = transaction(db, () => {
      member(projectId, req.user.id, true);
      const fields = issueFields(req.body, projectId);
      // Allocate the per-project number inside the transaction: if anything
      // after this fails, the allocation rolls back and the number is reused.
      const number = db.prepare('UPDATE projects SET next_number=next_number+1 WHERE id=? RETURNING next_number-1 AS number').get(projectId).number;
      const stamp = now();
      const result = db.prepare(`INSERT INTO issues(project_id,number,title,description,status,priority,assignee_id,creator_id,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).run(projectId, number, fields.title, fields.description, fields.status, fields.priority, fields.assigneeId, req.user.id, stamp, stamp);
      const issueId = Number(result.lastInsertRowid);
      event(projectId, issueId, req.user.id, 'created', 'Created this issue');
      return getIssue(issueId, req.user.id);
    });
    res.status(201).json({ issue });
  });
  app.get('/api/issues/:id', (req, res) => {
    const issueId = id(req.params.id);
    const issue = getIssue(issueId, req.user.id);
    const comments = db.prepare(`SELECT c.id,c.issue_id AS issueId,c.body,u.name AS authorName,u.initials AS authorInitials,c.created_at AS createdAt
      FROM comments c JOIN users u ON u.id=c.author_id WHERE c.issue_id=? ORDER BY c.id`).all(issueId);
    res.json({ issue, comments });
  });
  app.patch('/api/issues/:id', (req, res) => {
    const issueId = id(req.params.id);
    object(req.body, ['version', 'title', 'description', 'status', 'priority', 'assigneeId']);
    const expected = version(req.body.version);
    if (Object.keys(req.body).length < 2) fail(400, 'VALIDATION', 'Provide at least one field to update.');
    const issue = transaction(db, () => {
      const previous = getIssue(issueId, req.user.id, true);
      const fields = issueFields(req.body, previous.projectId, previous);
      // The compare-and-swap: the UPDATE matches only the version the client
      // read and increments it in the same statement. A writer holding a stale
      // version changes zero rows and gets 409 with the current issue — it can
      // never silently overwrite a newer edit.
      const result = db.prepare(`UPDATE issues SET title=?,description=?,status=?,priority=?,assignee_id=?,version=version+1,updated_at=?
        WHERE id=? AND version=? AND archived_at IS NULL`).run(fields.title, fields.description, fields.status, fields.priority, fields.assigneeId, now(), issueId, expected);
      if (result.changes !== 1) fail(409, 'VERSION_CONFLICT', 'This issue changed since you opened it. Your draft has not been saved.', previous);
      const changed = Object.keys(fields).filter((key) => fields[key] !== previous[key]);
      const details = changed.map((key) => key === 'status' || key === 'priority'
        ? `${key}: ${previous[key].replaceAll('_', ' ')} → ${fields[key].replaceAll('_', ' ')}`
        : key === 'assigneeId' ? 'Changed assignee' : `Updated ${key}`).join('; ') || 'Saved issue';
      event(previous.projectId, issueId, req.user.id, 'updated', details);
      return getIssue(issueId, req.user.id);
    });
    res.json({ issue });
  });
  app.delete('/api/issues/:id', (req, res) => {
    const issueId = id(req.params.id);
    object(req.body, ['version']);
    const expected = version(req.body.version);
    transaction(db, () => {
      const previous = getIssue(issueId, req.user.id, true);
      const stamp = now();
      const result = db.prepare('UPDATE issues SET archived_at=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND archived_at IS NULL').run(stamp, stamp, issueId, expected);
      if (result.changes !== 1) fail(409, 'VERSION_CONFLICT', 'This issue changed before it could be archived.', previous);
      event(previous.projectId, issueId, req.user.id, 'archived', 'Archived this issue');
    });
    res.status(204).end();
  });
  app.post('/api/issues/:id/comments', (req, res) => {
    const issueId = id(req.params.id);
    object(req.body, ['body']);
    const body = text(req.body.body, 'Comment', 4000, true);
    const comment = transaction(db, () => {
      const issue = getIssue(issueId, req.user.id, true);
      const stamp = now();
      const result = db.prepare('INSERT INTO comments(issue_id,author_id,body,created_at) VALUES(?,?,?,?)').run(issueId, req.user.id, body, stamp);
      event(issue.projectId, issueId, req.user.id, 'commented', 'Added a comment');
      return { id: Number(result.lastInsertRowid), issueId, body, authorName: req.user.name, authorInitials: req.user.initials, createdAt: stamp };
    });
    res.status(201).json({ comment });
  });
  app.get('/api/projects/:id/activity', (req, res) => {
    const projectId = id(req.params.id);
    member(projectId, req.user.id);
    const events = db.prepare(`SELECT a.id,a.issue_id AS issueId,CASE WHEN i.id IS NOT NULL THEN p.key || '-' || i.number END AS issueKey,
      u.name AS actorName,a.action,a.detail,a.created_at AS createdAt FROM activity a
      JOIN users u ON u.id=a.actor_id JOIN projects p ON p.id=a.project_id LEFT JOIN issues i ON i.id=a.issue_id
      WHERE a.project_id=? ORDER BY a.id DESC LIMIT 100`).all(projectId);
    res.json({ events });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.', code: 'NOT_FOUND' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url)), { etag: true, maxAge: 0 }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message, code: error.code, ...(error.current ? { current: error.current } : {}) });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.', code: 'VALIDATION' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.', code: 'TOO_LARGE' });
    if (error.errcode === 5 || error.code === 'SQLITE_BUSY') return res.status(503).json({ error: 'The database is busy. Refresh before retrying.', code: 'BUSY' });
    logger.error('Request failed:', error.message);
    res.status(500).json({ error: 'The change could not be completed. No partial change was saved.', code: 'INTERNAL' });
  });
  return { app, db, close: () => db.close() };
}
