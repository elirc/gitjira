const TYPE_ICON = { EPIC: '🟣', STORY: '🟢', TASK: '🔵', BUG: '🔴', SUBTASK: '⚪' };
const PRIORITY_LABEL = { LOWEST: '▽', LOW: '⌄', MEDIUM: '=', HIGH: '⌃', HIGHEST: '△' };

export function IssueTable({ issues }) {
  if (issues.length === 0) {
    return <p className="empty-state">No issues match. Create one, or change the filter.</p>;
  }

  return (
    <table className="issue-table">
      <thead>
        <tr>
          <th>Key</th>
          <th>T</th>
          <th>Title</th>
          <th>Priority</th>
          <th>Assignee</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td className="mono">{issue.key}</td>
            <td>{TYPE_ICON[issue.type]}</td>
            <td>{issue.title}</td>
            <td>{PRIORITY_LABEL[issue.priority]}</td>
            <td>{issue.assignee?.name ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
