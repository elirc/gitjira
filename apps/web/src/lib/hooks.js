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
