import { useState } from 'react';
import { useNotifications, useMarkAllRead } from '../lib/hooks.js';
import { timeAgo } from '../lib/format.js';

const LABEL = {
  'issue.assigned': 'assigned an issue to you',
  'comment.mention': 'mentioned you in a comment',
};

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const unread = data?.unread ?? 0;

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="link-button" onClick={() => markAll.mutate()}>
                Mark all read
              </button>
            )}
          </div>
          {(data?.notifications ?? []).length === 0 ? (
            <p className="muted empty-state">You're all caught up.</p>
          ) : (
            <ul className="bell-list">
              {data.notifications.map((n) => (
                <li key={n.id} className={n.readAt ? 'read' : 'unread'}>
                  <span>{LABEL[n.kind] ?? n.kind}</span>
                  {n.payload?.key && <span className="mono"> {n.payload.key}</span>}
                  <span className="muted"> · {timeAgo(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
