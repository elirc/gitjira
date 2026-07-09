import { apiPath } from '@gitjira/shared';

// LEARN: every fetch in the app goes through this one function — which is
// why the auth upgrade this sprint was a one-file change, as predicted in
// sprint 01's self-review.
let accessToken = null;
let authLostHandler = () => {};
let refreshInFlight = null;

export const setAccessToken = (token) => {
  accessToken = token;
};
export const onAuthLost = (fn) => {
  authLostHandler = fn;
  return () => {
    authLostHandler = () => {};
  };
};

async function rawFetch(route, options) {
  const res = await fetch(apiPath(route), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  return res;
}

// LEARN: the silent-refresh dance. On a 401 we refresh ONCE and retry.
// refreshInFlight makes concurrent 401s share a single refresh call —
// without it, five parallel requests expiring together fire five
// refreshes, and rotation makes four of them replay-killers (see the
// api's replay-detection test for why that logs everyone out).
async function refreshSession() {
  refreshInFlight ??= (async () => {
    try {
      const res = await rawFetch('/auth/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('refresh failed');
      const session = await res.json();
      accessToken = session.accessToken;
      return session;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api(route, options = {}) {
  let res = await rawFetch(route, options);

  const isAuthRoute = route.startsWith('/auth/');
  if (res.status === 401 && !isAuthRoute) {
    try {
      await refreshSession();
    } catch {
      authLostHandler();
      throw new Error('Session expired');
    }
    res = await rawFetch(route, options);
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error?.message ?? `API ${res.status}`);
    err.status = res.status;
    err.details = body.error?.details;
    throw err;
  }
  return body;
}
