import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounced } from '../lib/useDebounced.js';
import { useProjects } from '../lib/hooks.js';

// LEARN: a Cmd+K command palette. Two jobs in one box:
//   1. jump by key — type "GJ-42" and go straight there
//   2. jump by project — fuzzy-match project names
// The input is DEBOUNCED (see useDebounced) so we don't recompute on every
// keystroke. A global keydown listener toggles it — note the cleanup return,
// the same effect-hygiene lesson from sprint 08's socket subscriptions.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 150);
  const navigate = useNavigate();
  const { data: projects } = useProjects();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey); // cleanup!
  }, []);

  if (!open) return null;

  // Is the query an issue key like GJ-42?
  const keyMatch = debounced.trim().match(/^([A-Za-z][A-Za-z0-9]+)-(\d+)$/);
  const projectMatches = (projects ?? []).filter((p) =>
    `${p.key} ${p.name}`.toLowerCase().includes(debounced.toLowerCase())
  );

  const go = (to) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder="Jump to a project, or type an issue key (GJ-42)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="palette-results">
          {keyMatch && (
            <li>
              <button
                onClick={() =>
                  go(
                    `/projects/${keyMatch[1].toUpperCase()}?selected=${keyMatch[1].toUpperCase()}-${keyMatch[2]}`
                  )
                }
              >
                Go to issue{' '}
                <span className="mono">
                  {keyMatch[1].toUpperCase()}-{keyMatch[2]}
                </span>
              </button>
            </li>
          )}
          {projectMatches.map((p) => (
            <li key={p.id}>
              <button onClick={() => go(`/projects/${p.key}`)}>
                <span className="mono">{p.key}</span> {p.name}
              </button>
            </li>
          ))}
          {!keyMatch && projectMatches.length === 0 && debounced && (
            <li className="muted">No matches</li>
          )}
        </ul>
        <div className="palette-hint">Esc to close · Cmd/Ctrl+K to toggle</div>
      </div>
    </div>
  );
}
