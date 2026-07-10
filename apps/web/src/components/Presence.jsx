// LEARN: presence is just "who is in the room" — the socket server already
// knows (room membership), so the client only renders it. Cheap feature,
// high perceived value.
export function Presence({ viewers }) {
  if (!viewers || viewers.length === 0) return null;
  return (
    <div className="presence" title={viewers.map((v) => v.name).join(', ')}>
      {viewers.slice(0, 5).map((v) => (
        <span key={v.id} className="assignee-dot" title={v.name}>
          {v.name?.[0] ?? '·'}
        </span>
      ))}
      {viewers.length > 5 && <span className="muted">+{viewers.length - 5}</span>}
    </div>
  );
}
