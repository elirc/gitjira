// LEARN: query keys are a PUBLIC API in TanStack Query — every cache read,
// write, and invalidation addresses data through these keys. Centralizing
// them (instead of scattering ['issues', key] literals) means a rename is
// one edit, and invalidation targets can't typo their way into silent
// cache misses.
export const queryKeys = {
  me: ['me'],
  projects: ['projects'],
  project: (key) => ['projects', key],
  issues: (projectKey, filters = {}) => ['projects', projectKey, 'issues', filters],
  issue: (projectKey, number) => ['projects', projectKey, 'issues', number],
};
