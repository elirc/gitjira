import { useState, useEffect } from 'react';
import { useIssueDetail, useAddComment, usePatchIssueField } from '../../lib/hooks.js';
import { describeActivity, timeAgo } from '../../lib/format.js';

const PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];

export function IssueDetailPanel({ projectKey, number, onClose }) {
  const { data: issue, isLoading } = useIssueDetail(projectKey, number);
  const addComment = useAddComment(projectKey, number);
  const patch = usePatchIssueField(projectKey, number);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [commentBody, setCommentBody] = useState('');

  // Reset the description draft whenever a different issue loads into the panel.
  useEffect(() => {
    if (issue) setDescDraft(issue.description ?? '');
  }, [issue?.id, issue?.description]);

  // LEARN: dirty-state guard (review finding). Closing the panel while editing
  // the description used to discard the edit silently — a trust-breaker. If
  // there are unsaved changes, confirm before closing. window.confirm is fine
  // for v1; a nicer dialog is sprint 14. Both the ✕ and the backdrop call this.
  const requestClose = () => {
    const dirty = editingDesc && descDraft !== (issue?.description ?? '');
    if (dirty && !window.confirm('Discard unsaved description changes?')) return;
    onClose();
  };

  if (isLoading || !issue) {
    return (
      <aside className="detail-panel">
        <div className="detail-skeleton" />
      </aside>
    );
  }

  const usersById = {};
  issue.activityEvents.forEach((e) => {
    if (e.actor) usersById[e.actor.id] = e.actor;
  });

  // Guard the zero case: 0/0 would be NaN% (review finding).
  const { done, total } = issue.progress;
  const progressPct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <aside className="detail-panel" role="dialog" aria-label={`Issue ${issue.key}`}>
      <div className="detail-header">
        <span className="mono">{issue.key}</span>
        <button className="link-button" onClick={requestClose} aria-label="Close">
          ✕
        </button>
      </div>

      <h2>{issue.title}</h2>

      <div className="detail-fields">
        <label>
          Priority
          <select
            value={issue.priority}
            onChange={(e) => patch.mutate({ priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <span className="detail-status">{issue.columnName}</span>
      </div>

      <section>
        <h3>Description</h3>
        {editingDesc ? (
          <>
            <textarea rows={5} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
            <div className="detail-actions">
              <button
                onClick={() => {
                  patch.mutate({ description: descDraft });
                  setEditingDesc(false);
                }}
              >
                Save
              </button>
              <button className="secondary" onClick={() => setEditingDesc(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="detail-desc" onClick={() => setEditingDesc(true)}>
            {issue.description || <span className="muted">Add a description…</span>}
          </p>
        )}
      </section>

      <section>
        <h3>
          Sub-tasks{' '}
          <span className="muted">
            {issue.progress.done}/{issue.progress.total} ({progressPct}%)
          </span>
        </h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <ul className="subtask-list">
          {issue.children.map((c) => (
            <li key={c.id}>
              <span className="mono">
                {projectKey}-{c.number}
              </span>{' '}
              {c.title}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Comments</h3>
        {issue.comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-meta">
              <strong>{c.author.name}</strong> <span className="muted">{timeAgo(c.createdAt)}</span>
            </div>
            <div>{c.body}</div>
          </div>
        ))}
        <div className="comment-compose">
          <textarea
            rows={2}
            placeholder="Add a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <button
            disabled={!commentBody.trim() || addComment.isPending}
            onClick={() => {
              addComment.mutate(commentBody);
              setCommentBody('');
            }}
          >
            Comment
          </button>
        </div>
      </section>

      <section>
        <h3>Activity</h3>
        <ul className="activity-list">
          {issue.activityEvents.map((e) => (
            <li key={e.id}>
              {describeActivity(e, usersById)} <span className="muted">{timeAgo(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
