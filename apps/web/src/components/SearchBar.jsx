import { useState } from 'react';
import { useSaveFilter, useSavedFilters } from '../lib/hooks.js';

// LEARN: a JQL input with a "save this filter" affordance. The parsing lives on
// the server (shared package) — the client just sends the query text and shows
// the error position the server returns. Keeping the grammar server-authoritative
// means the client can't accept a query the server would reject.
export function SearchBar({ jql, onChange, error }) {
  const { data: filters } = useSavedFilters();
  const saveFilter = useSaveFilter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="search-bar">
      <div className="search-row">
        <input
          className="jql-input"
          placeholder="Search — try: type = bug AND assignee = me"
          value={jql}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
        {jql && (
          <button className="secondary" onClick={() => setSaving((s) => !s)}>
            Save
          </button>
        )}
      </div>

      {error && <div className="jql-error">⚠ {error}</div>}

      {saving && (
        <div className="search-row">
          <input
            placeholder="Filter name (e.g. My Bugs)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={async () => {
              await saveFilter.mutateAsync({ name, jql });
              setName('');
              setSaving(false);
            }}
          >
            Save filter
          </button>
        </div>
      )}

      {filters?.length > 0 && (
        <div className="saved-filters">
          {filters.map((f) => (
            <button key={f.id} className="chip" onClick={() => onChange(f.jql)} title={f.jql}>
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
