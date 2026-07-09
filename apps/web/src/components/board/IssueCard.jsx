import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TYPE_ICON = { EPIC: '🟣', STORY: '🟢', TASK: '🔵', BUG: '🔴', SUBTASK: '⚪' };
const PRIORITY = { LOWEST: '▽', LOW: '⌄', MEDIUM: '=', HIGH: '⌃', HIGHEST: '△' };

export function IssueCard({ issue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { columnId: issue.columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="issue-card" {...attributes} {...listeners}>
      <div className="issue-card-top">
        <span className="mono">{issue.key}</span>
        <span>{TYPE_ICON[issue.type]}</span>
      </div>
      <div className="issue-card-title">{issue.title}</div>
      <div className="issue-card-bottom">
        <span title={issue.priority}>{PRIORITY[issue.priority]}</span>
        <span className="assignee-dot">{issue.assignee?.name?.[0] ?? '·'}</span>
      </div>
    </div>
  );
}
