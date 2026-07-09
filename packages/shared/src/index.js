// LEARN: This package exists so client and server can share code without
// copy-paste drift. It is nearly empty on purpose: we wire the plumbing
// while it is trivial, so that when something real needs sharing (sprint 02:
// validation schemas), the path already works.
export const API_PREFIX = '/api';

export function apiPath(route) {
  return `${API_PREFIX}${route.startsWith('/') ? route : `/${route}`}`;
}
