import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { groupByColumn, positionForDrop } from '../../lib/board.js';
import { useMoveIssue } from '../../lib/hooks.js';
import { setFailNextMove, shouldFailNextMove } from '../../lib/devFlags.js';
import { BoardColumn } from './BoardColumn.jsx';
import { IssueCard } from './IssueCard.jsx';

export function Board({ projectKey, columns, issues, filters }) {
  const move = useMoveIssue(projectKey, filters);
  const [activeId, setActiveId] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  // LEARN: sensors decide what "a drag" is. PointerSensor with a small
  // distance threshold means a click isn't mistaken for a drag; the
  // KeyboardSensor is what makes the board operable without a mouse — the
  // accessibility win the stakeholder asked for if it was cheap. It was.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const grouped = useMemo(() => groupByColumn(issues, columns), [issues, columns]);
  const activeIssue = issues.find((i) => i.id === activeId);

  function columnOf(id) {
    // an id is either a card id or a column id
    if (columns.some((c) => c.id === id)) return id;
    return issues.find((i) => i.id === id)?.columnId;
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const destColumnId = columnOf(over.id);
    const destIssues = grouped.get(destColumnId) ?? [];
    const overIndex = destIssues.findIndex((i) => i.id === over.id);
    const dropIndex = overIndex === -1 ? destIssues.length : overIndex;

    const moving = issues.find((i) => i.id === active.id);
    if (!moving) return;

    const position = positionForDrop(destIssues, dropIndex, moving.id);
    if (moving.columnId === destColumnId && moving.position === position) return;

    const destName = columns.find((c) => c.id === destColumnId)?.name;
    setAnnouncement(
      `${moving.key} moved to ${destName}, position ${dropIndex + 1} of ${destIssues.length + 1}`
    );

    move.mutate(
      { number: moving.number, columnId: destColumnId, position, _fail: shouldFailNextMove() },
      {
        onError: () => setAnnouncement(`Move of ${moving.key} failed and was reverted`),
      }
    );
  }

  return (
    <>
      <div className="board-toolbar">
        <label
          className="dev-toggle"
          title="Dev-only: force the next move to fail so you can watch the rollback"
        >
          <input type="checkbox" onChange={(e) => setFailNextMove(e.target.checked)} /> Fail next
          move (dev)
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board">
          {columns.map((column) => (
            <BoardColumn key={column.id} column={column} issues={grouped.get(column.id) ?? []} />
          ))}
        </div>

        {/* LEARN: DragOverlay renders the card that follows the cursor,
            decoupled from list layout — smoother than dragging the real node. */}
        <DragOverlay>{activeIssue ? <IssueCard issue={activeIssue} /> : null}</DragOverlay>
      </DndContext>

      {/* LEARN: a visually-hidden live region. Screen readers announce its text
          when it changes, so keyboard/AT users hear the result of a move. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
