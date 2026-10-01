import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// BEGIN IMMEDIATE takes SQLite's write lock up front, so a transaction's reads
// (authorization, version checks) are already serialized against competing
// writers; plain BEGIN would allow a lock upgrade deadlock between processes.
export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath, { timeout: 5000 });
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  try {
    transaction(db, () => {
      const version = db.prepare('PRAGMA user_version').get().user_version;
      if (version > 1) throw new Error('Database schema is newer than this application.');
      if (version === 1) return;
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, initials TEXT NOT NULL, color TEXT NOT NULL
        ) STRICT;
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
          next_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE memberships (
          project_id INTEGER NOT NULL REFERENCES projects(id), user_id INTEGER NOT NULL REFERENCES users(id),
          role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')), PRIMARY KEY(project_id,user_id)
        ) STRICT;
        CREATE TABLE issues (
          id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id), number INTEGER NOT NULL,
          title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 180), description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL CHECK(status IN ('backlog','todo','in_progress','done')),
          priority TEXT NOT NULL CHECK(priority IN ('low','medium','high','urgent')),
          assignee_id INTEGER REFERENCES users(id), creator_id INTEGER NOT NULL REFERENCES users(id),
          version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          archived_at TEXT, UNIQUE(project_id,number)
        ) STRICT;
        CREATE TABLE comments (
          id INTEGER PRIMARY KEY, issue_id INTEGER NOT NULL REFERENCES issues(id),
          author_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 4000),
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE activity (
          id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id),
          issue_id INTEGER REFERENCES issues(id), actor_id INTEGER NOT NULL REFERENCES users(id),
          action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
        ) STRICT;
        CREATE INDEX issues_board ON issues(project_id,archived_at,status,number);
        CREATE INDEX activity_project ON activity(project_id,id DESC);
        CREATE INDEX comments_issue ON comments(issue_id,id);
        CREATE INDEX sessions_expiry ON sessions(expires_at);
      `);
      const user = db.prepare('INSERT INTO users VALUES (?,?,?,?)');
      user.run(1, 'Avery Chen', 'AC', '#27675c');
      user.run(2, 'Sam Rivera', 'SR', '#7b5b99');
      user.run(3, 'Jordan Ellis', 'JE', '#b06b3a');
      user.run(4, 'Taylor Brooks', 'TB', '#426ca5');
      const now = new Date().toISOString();
      const project = db.prepare('INSERT INTO projects(id,key,name,description,next_number,created_at) VALUES(?,?,?,?,?,?)');
      project.run(1, 'LAUNCH', 'Product launch', 'A calmer place to turn the next good idea into something people can use.', 10, now);
      project.run(2, 'LAB', 'Research lab', 'A separate workspace for Taylor. Membership boundaries are enforced by the API.', 2, now);
      db.exec("INSERT INTO memberships VALUES(1,1,'owner'),(1,2,'editor'),(1,3,'viewer'),(2,4,'owner')");
      const issues = [
        ['Map the first-run experience', 'Outline the moments between opening the product and creating the first project. Keep the happy path under a minute.', 'backlog', 'medium', 1],
        ['Explore keyboard-first navigation', 'Make the board useful without reaching for a mouse. Start with visible focus and native controls.', 'backlog', 'low', 2],
        ['Write the launch announcement', 'Explain the problem we solve, show a real workflow, and invite thoughtful feedback.', 'todo', 'medium', null],
        ['Review empty states', 'Every empty screen should explain what belongs here and offer a clear next action.', 'todo', 'low', 1],
        ['Stress-test simultaneous edits', 'Two people save the same issue. One succeeds; the other sees a useful conflict message with their draft preserved.', 'in_progress', 'urgent', 2],
        ['Polish the project workspace', 'Refine hierarchy, spacing, and the relationship between the board and issue details.', 'in_progress', 'high', 1],
        ['Verify project permissions', 'A viewer can read, an editor can contribute, and an owner can manage membership. Test the API as well as the UI.', 'in_progress', 'high', 2],
        ['Define the issue lifecycle', 'Backlog → To do → In progress → Done. Moving backward is allowed; the activity trail tells the story.', 'done', 'medium', 1],
        ['Choose a persistence boundary', 'Store issues, comments, and activity together. A write is complete only when the database transaction commits.', 'done', 'high', 2],
      ];
      const insert = db.prepare(`INSERT INTO issues(project_id,number,title,description,status,priority,assignee_id,creator_id,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)`);
      const event = db.prepare('INSERT INTO activity(project_id,issue_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?)');
      issues.forEach(([title, description, status, priority, assignee], i) => {
        const result = insert.run(1, i + 1, title, description, status, priority, assignee, 1, now, now);
        event.run(1, Number(result.lastInsertRowid), 1, 'created', 'Created this issue', now);
      });
      insert.run(2, 1, 'Private research notes', 'Visible only to Research lab members.', 'todo', 'medium', 4, 4, now, now);
      db.prepare('INSERT INTO comments(issue_id,author_id,body,created_at) VALUES(?,?,?,?)')
        .run(5, 2, 'The stale-write test needs two independent processes, not just two promises in one event loop.', now);
      event.run(1, 5, 2, 'commented', 'Added a comment', now);
      db.exec('PRAGMA user_version = 1');
    });
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
