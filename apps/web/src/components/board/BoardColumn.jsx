import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IssueCard } from './IssueCard.jsx';

export function BoardColumn({ column, issues }) {
  // LEARN: a column is a droppable region; the cards inside it are a sortable
  // list. dnd-kit needs both — the column so you can drop into an EMPTY column,
  // the SortableContext so cards reorder among themselves.
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { columnId: column.id } });

  return (
    <div className="board-column">
      <div className="board-column-header">
        {column.name} <span className="count">{issues.length}</span>
      </div>
      <div ref={setNodeRef} className={`board-column-body${isOver ? ' is-over' : ''}`}>
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          {issues.length === 0 && <div className="board-empty">Drop here</div>}
        </SortableContext>
      </div>
    </div>
  );
}
