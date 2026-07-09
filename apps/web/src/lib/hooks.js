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
          issues: old.issues.map((issue) => {
            if (issue.number !== number) return issue;
            // apply the optimistic move
            issue.columnId = columnId;
            issue.position = position;
            return issue;
          }),
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
