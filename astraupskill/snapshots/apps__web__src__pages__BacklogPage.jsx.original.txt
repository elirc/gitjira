import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useProject,
  useIssues,
  useSprints,
  useCreateSprint,
  useSprintAction,
} from '../lib/hooks.js';

// LEARN: the backlog is "issues with no sprint" — there's no Backlog table.
// The absence of a sprintId IS the backlog. Modeling a state as the absence of
// a relationship (rather than a status flag) keeps the data honest: an issue
// can't be both in the backlog and in a sprint.
export function BacklogPage() {
  const { key } = useParams();
  const { data: project } = useProject(key);
  const { data } = useIssues(key, {});
  const { data: sprints } = useSprints(key);
  const createSprint = useCreateSprint(key);
  const actions = useSprintAction(key);
  const [newName, setNewName] = useState('');

  if (!data || !sprints || !project) return <p>Loading backlog…</p>;

  const issues = data.issues;
  const bySprint = (sprintId) => issues.filter((i) => i.sprintId === sprintId);
  const backlog = bySprint(null);
  const activeSprint = sprints.find((s) => s.state === 'ACTIVE');

  const pointsOf = (list) => list.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  const SprintSection = ({ sprint }) => {
    const sprintIssues = bySprint(sprint.id);
    return (
      <section className="sprint-section">
        <div className="sprint-head">
          <div>
            <strong>{sprint.name}</strong>{' '}
            <span className={`badge state-${sprint.state}`}>{sprint.state}</span>
            {sprint.goal && <span className="muted"> — {sprint.goal}</span>}
          </div>
          <div className="sprint-actions">
            <span className="muted">
              {sprintIssues.length} issues · {pointsOf(sprintIssues)} pts
            </span>
            {sprint.state === 'PLANNED' && (
              <button
                disabled={sprintIssues.length === 0 || Boolean(activeSprint)}
                title={activeSprint ? 'Another sprint is already active' : ''}
                onClick={() => actions.start.mutate(sprint.id)}
              >
                Start sprint
              </button>
            )}
            {sprint.state === 'ACTIVE' && (
              <button
                onClick={() =>
                  actions.complete.mutate({ id: sprint.id, moveUnfinishedTo: 'backlog' })
                }
              >
                Complete sprint
              </button>
            )}
          </div>
        </div>
        <IssueList list={sprintIssues} sprints={sprints} actions={actions} projectKey={key} />
      </section>
    );
  };

  return (
    <>
      <h1>
        <span className="project-key">{project.key}</span> Backlog
      </h1>

      <div className="create-sprint">
        <input
          placeholder="New sprint name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          disabled={!newName.trim()}
          onClick={async () => {
            await createSprint.mutateAsync({ name: newName });
            setNewName('');
          }}
        >
          Create sprint
        </button>
      </div>

      {sprints
        .filter((s) => s.state !== 'COMPLETED')
        .map((s) => (
          <SprintSection key={s.id} sprint={s} />
        ))}

      <section className="sprint-section">
        <div className="sprint-head">
          <strong>Backlog</strong>{' '}
          <span className="muted">
            {backlog.length} issues · {pointsOf(backlog)} pts
          </span>
        </div>
        <IssueList list={backlog} sprints={sprints} actions={actions} projectKey={key} />
      </section>
    </>
  );
}

function IssueList({ list, sprints, actions }) {
  if (list.length === 0) return <p className="muted empty-state">No issues here.</p>;
  return (
    <ul className="backlog-list">
      {list.map((issue) => (
        <li key={issue.id}>
          <span className="mono">{issue.key}</span>
          <span className="backlog-title">{issue.title}</span>
          <span className="muted">{issue.storyPoints ?? '–'} pts</span>
          <select
            value={issue.sprintId ?? ''}
            onChange={(e) =>
              actions.assign.mutate({ number: issue.number, sprintId: e.target.value || null })
            }
          >
            <option value="">Backlog</option>
            {sprints
              .filter((s) => s.state !== 'COMPLETED')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
