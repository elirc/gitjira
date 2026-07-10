import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useProject, useIssues, useSearch, useCreateIssue } from '../lib/hooks.js';
import { useDebounced } from '../lib/useDebounced.js';
import { IssueTable } from '../components/IssueTable.jsx';
import { Board } from '../components/board/Board.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { CreateIssueModal } from '../components/CreateIssueModal.jsx';
import { IssueDetailPanel } from '../components/detail/IssueDetailPanel.jsx';
import { Presence } from '../components/Presence.jsx';
import { useLiveProject } from '../lib/useLiveProject.js';

export function ProjectBoardPage() {
  const { key } = useParams();
  const { data: project, isLoading: projectLoading } = useProject(key);
  const [view, setView] = useState('board');
  const [modalOpen, setModalOpen] = useState(false);
  const createIssue = useCreateIssue(key);

  // Live updates + presence for this project (joins the socket room).
  const { viewers } = useLiveProject(project?.id);

  // LEARN: search state is debounced — the query only fires 250ms after the
  // user stops typing (see useDebounced). The sprint-4 client-side type filter
  // is GONE: server-side JQL does everything it did and more, and two filtering
  // code paths is a bug generator. Deleting code you replaced is progress.
  const [jql, setJql] = useState('');
  const debouncedJql = useDebounced(jql, 250);
  const isSearching = debouncedJql.trim().length > 0;

  const browse = useIssues(key, {});
  const search = useSearch(key, { jql: debouncedJql });

  const active = isSearching ? search : browse;
  const issues = active.data?.issues ?? [];
  const searchError = isSearching && search.isError ? search.error.message : null;

  // Selected issue lives in the URL — deep-linking, back button, shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get('selected');
  const selectedNumber = selectedKey ? Number(selectedKey.split('-')[1]) : null;

  const selectIssue = (issue) => {
    setSearchParams((prev) => {
      prev.set('selected', issue.key);
      return prev;
    });
  };
  const clearSelection = () => {
    setSearchParams((prev) => {
      prev.delete('selected');
      return prev;
    });
  };

  if (projectLoading) return <p>Loading project…</p>;
  if (browse.isError) return <p className="form-error">{browse.error.message}</p>;

  return (
    <>
      <div className="page-header">
        <h1>
          <span className="project-key">{project?.key}</span> {project?.name}
        </h1>
        <div className="header-actions">
          <Presence viewers={viewers} />
          <Link className="chip" to={`/projects/${key}/backlog`}>
            Backlog
          </Link>
          <div className="view-switch">
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
              Board
            </button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              Table
            </button>
          </div>
          <button onClick={() => setModalOpen(true)}>New issue</button>
        </div>
      </div>

      <SearchBar jql={jql} onChange={setJql} error={searchError} />

      {active.isLoading ? (
        <p>Loading issues…</p>
      ) : isSearching && view === 'board' ? (
        // A JQL result is a flat list, so we show it as a table regardless of view.
        <IssueTable issues={issues} onSelectIssue={selectIssue} />
      ) : view === 'board' ? (
        <Board
          projectKey={key}
          columns={project.columns}
          issues={issues}
          filters={{}}
          onSelectIssue={selectIssue}
        />
      ) : (
        <IssueTable issues={issues} onSelectIssue={selectIssue} />
      )}

      {selectedNumber && (
        <IssueDetailPanel projectKey={key} number={selectedNumber} onClose={clearSelection} />
      )}

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
