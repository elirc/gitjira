import { QueryClient } from '@tanstack/react-query';

// LEARN: one QueryClient holds the whole app's server-state cache. The
// defaults here are policy: staleTime says "trust cached data for 30s
// before refetching" (tuned harder in sprint 12), and retry:1 means a
// flaky request gets one second chance, not five — failing fast beats
// hammering a struggling server.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
