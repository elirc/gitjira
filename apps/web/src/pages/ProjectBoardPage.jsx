import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject, useIssues, useCreateIssue } from '../lib/hooks.js';
import { IssueTable } from '../components/IssueTable.jsx';
import { CreateIssueModal } from '../components/CreateIssueModal.jsx';

const TYPE_FILTERS = ['', 'EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'];

export function ProjectBoardPage() {
  const { key } = useParams();
  const { data: project, isLoading: projectLoading } = useProject(key);
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading, isError, error } = useIssues(key, { type: typeFilter });
  const [modalOpen, setModalOpen] = useState(false);
  const createIssue = useCreateIssue(key);

  if (projectLoading) return <p>Loading project…</p>;
  if (isError) return <p className="form-error">{error.message}</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            <span className="project-key">{project?.key}</span> {project?.name}
          </h1>
        </div>
        <button onClick={() => setModalOpen(true)}>New issue</button>
      </div>

      <div className="filter-bar">
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>
                {t || 'All'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <p>Loading issues…</p> : <IssueTable issues={data.issues} />}

      {modalOpen && project && (
        <CreateIssueModal
          columns={project.columns}
          onClose={() => setModalOpen(false)}
          onCreate={async (values) => {
            await createIssue.mutateAsync(values);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
