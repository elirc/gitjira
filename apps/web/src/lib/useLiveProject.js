import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from './socket.js';

// LEARN: this hook wires the socket into the TanStack Query cache. When the
// server broadcasts an "activity" event for this project, we INVALIDATE the
// relevant queries so they refetch — the board updates without a manual
// refresh. Invalidate (not patch) is the safe default: the event is just a
// "something changed" hint, and the refetch reads authoritative state.
export function useLiveProject(projectId) {
  const qc = useQueryClient();
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    const onActivity = () => {
      // a change happened in this project — refetch the issue lists/board
      qc.invalidateQueries({ queryKey: ['projects'] });
    };
    const onPresence = (users) => setViewers(users);

    socket.emit('join-project', { projectId });
    socket.on('activity', onActivity);
    socket.on('presence', onPresence);

    // GOTCHA (planted): this effect subscribes but returns NO cleanup. Every
    // time the component mounts (navigate away and back, filter change,
    // StrictMode double-mount) it adds ANOTHER 'activity' listener and never
    // removes the old ones. After three visits, one server event fires the
    // handler three times — a subscription leak. The fix is a cleanup return.
  }, [projectId, qc]);

  return { viewers };
}
