import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@gitjira/shared/query-keys';
import { api } from './api.js';

// LEARN: data-fetching lives in hooks, not components. A component says
// `useProjects()` and gets loading/error/data; it never knows the URL. When
// the endpoint changes, one hook changes — not every screen that shows a
// project. This is the same choke-point discipline as lib/api.js, one layer up.

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => api('/projects').then((r) => r.projects),
  });
}

export function useProject(key) {
  return useQuery({
    queryKey: queryKeys.project(key),
    queryFn: () => api(`/projects/${key}`).then((r) => r.project),
    enabled: Boolean(key),
  });
}

export function useIssues(projectKey, filters = {}) {
  return useQuery({
    queryKey: queryKeys.issues(projectKey, filters),
    queryFn: () => {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      return api(`/projects/${projectKey}/issues${qs ? `?${qs}` : ''}`);
    },
    enabled: Boolean(projectKey),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/projects', { method: 'POST', body: JSON.stringify(body) }),
    // LEARN: after a create, the projects list is stale. Invalidating its
    // query key tells TanStack Query to refetch it — the new project appears
    // without us manually splicing it into the cache. The query key IS the
    // address; this is why we centralized the keys.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useCreateIssue(projectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api(`/projects/${projectKey}/issues`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'issues'] }),
  });
}

export function useUpdateIssue(projectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, patch }) =>
      api(`/projects/${projectKey}/issues/${number}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'issues'] }),
  });
}

// LEARN: the optimistic-update contract, in four beats:
//   onMutate  — snapshot the cache, then apply the change immediately
//   (mutationFn) — fire the request
//   onError   — put the snapshot back
//   onSettled — refetch to reconcile with the server's truth
// The card moves the instant you drop it (the stakeholder's "instant"); if the
// server rejects, it snaps back. Getting the rollback right is the subtle part.
export function useMoveIssue(projectKey, filters = {}) {
  const qc = useQueryClient();
  const key = queryKeys.issues(projectKey, filters);

  return useMutation({
    mutationFn: ({ number, columnId, position, _fail }) => {
      // dev-only forced failure (the "fail next move" toggle) to exercise the
      // rollback path — see lib/devFlags.js
      if (_fail) return Promise.reject(new Error('Forced move failure (dev toggle)'));
      return api(`/projects/${projectKey}/issues/${number}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ columnId, position }),
      });
    },

    onMutate: async ({ number, columnId, position }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          // LEARN: return a NEW object per moved issue — never mutate the
          // cached one. The snapshot above holds references to these same
          // objects; mutating in place would corrupt the snapshot and make
          // rollback a no-op (review finding on PR #39). Immutability is the
          // whole reason the snapshot can restore anything.
          issues: old.issues.map((issue) =>
            issue.number === number ? { ...issue, columnId, position } : issue
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // roll back to the snapshot
      if (context?.previous) qc.setQueryData(key, context.previous);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useIssueDetail(projectKey, number) {
  return useQuery({
    queryKey: queryKeys.issue(projectKey, number),
    queryFn: () => api(`/projects/${projectKey}/issues/${number}/detail`).then((r) => r.issue),
    enabled: Boolean(projectKey && number),
  });
}

export function useAddComment(projectKey, number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api(`/projects/${projectKey}/issues/${number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.issue(projectKey, number) }),
  });
}

export function usePatchIssueField(projectKey, number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) =>
      api(`/projects/${projectKey}/issues/${number}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issue(projectKey, number) });
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'issues'] });
    },
  });
}

// LEARN: search takes an AbortSignal so a stale request can be cancelled. When
// you type fast, request N+1 fires before request N returns; without
// cancellation, N's slower response can land AFTER N+1's and overwrite fresh
// results with stale ones (a classic out-of-order-response bug). TanStack
// Query passes `signal` for exactly this — we forward it to fetch.
export function useSearch(projectKey, { jql, text }) {
  return useQuery({
    queryKey: ['projects', projectKey, 'search', { jql, text }],
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams();
      if (jql) qs.set('jql', jql);
      if (text) qs.set('text', text);
      return api(`/projects/${projectKey}/issues/search?${qs}`, { signal });
    },
    enabled: Boolean(projectKey && (jql || text)),
    placeholderData: (prev) => prev, // keep old results visible while refetching
  });
}

export function useSavedFilters() {
  return useQuery({
    queryKey: ['me', 'filters'],
    queryFn: () => api('/me/filters').then((r) => r.filters),
  });
}

export function useSaveFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/me/filters', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'filters'] }),
  });
}

export function useSprints(projectKey) {
  return useQuery({
    queryKey: ['projects', projectKey, 'sprints'],
    queryFn: () => api(`/projects/${projectKey}/sprints`).then((r) => r.sprints),
    enabled: Boolean(projectKey),
  });
}
export function useCreateSprint(projectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api(`/projects/${projectKey}/sprints`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'sprints'] }),
  });
}
export function useSprintAction(projectKey) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects', projectKey, 'sprints'] });
    qc.invalidateQueries({ queryKey: ['projects', projectKey, 'issues'] });
  };
  return {
    start: useMutation({
      mutationFn: (id) => api(`/projects/${projectKey}/sprints/${id}/start`, { method: 'POST' }),
      onSuccess: invalidate,
    }),
    complete: useMutation({
      mutationFn: ({ id, moveUnfinishedTo }) =>
        api(`/projects/${projectKey}/sprints/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify({ moveUnfinishedTo }),
        }),
      onSuccess: invalidate,
    }),
    assign: useMutation({
      mutationFn: ({ number, sprintId }) =>
        api(`/projects/${projectKey}/issues/${number}/sprint`, {
          method: 'PATCH',
          body: JSON.stringify({ sprintId }),
        }),
      onSuccess: invalidate,
    }),
  };
}

export function useNotifications() {
  return useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: () => api('/me/notifications'),
    // LEARN: poll as a fallback so the badge updates even if the socket missed
    // an event. 30s is gentle; the socket makes it feel instant when connected.
    refetchInterval: 30_000,
  });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/me/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}
