import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject } from '../lib/hooks.js';
import { CreateProjectModal } from '../components/CreateProjectModal.jsx';

export function ProjectsPage() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const createProject = useCreateProject();

  if (isLoading) return <p>Loading projects…</p>;
  if (isError) return <p className="form-error">Couldn’t load projects: {error.message}</p>;

  return (
    <>
      <div className="page-header">
        <h1>Projects</h1>
        <button onClick={() => setModalOpen(true)}>New project</button>
      </div>

      {projects.length === 0 ? (
        <p className="empty-state">
          No projects yet. Create your first one to start tracking work.
        </p>
      ) : (
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.key}`}>
                <span className="project-key">{p.key}</span>
                <span className="project-name">{p.name}</span>
                <span className="project-count">{p._count.issues} issues</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <CreateProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={async (values) => {
            await createProject.mutateAsync(values);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
