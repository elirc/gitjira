// @ts-check
// LEARN: query keys are a PUBLIC API in TanStack Query — every cache read,
// write, and invalidation addresses data through these keys. Centralizing
// them (instead of scattering ['issues', key] literals) means a rename is
// one edit, and invalidation targets can't typo their way into silent
// cache misses.
export const queryKeys = {
  me: ['me'],
  projects: ['projects'],
  /** @param {string} key */
  project: (key) => ['projects', key],
  /** @param {string} projectKey @param {Record<string, unknown>} [filters] */
  issues: (projectKey, filters = {}) => ['projects', projectKey, 'issues', filters],
  /** @param {string} projectKey @param {number} number */
  issue: (projectKey, number) => ['projects', projectKey, 'issues', number],
};
