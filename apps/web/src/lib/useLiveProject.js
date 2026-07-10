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

    // LEARN: cleanup (review finding). Every subscription an effect starts must
    // be torn down when the effect re-runs or the component unmounts, or the
    // listeners stack across remounts and one event fires the handler N times.
    // Returning this function is the whole fix — same lesson as the sprint-06
    // Cmd+K global listener.
    return () => {
      socket.off('activity', onActivity);
      socket.off('presence', onPresence);
      socket.emit('leave-project', { projectId });
    };
  }, [projectId, qc]);

  return { viewers };
}
