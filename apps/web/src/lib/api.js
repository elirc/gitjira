import { apiPath } from '@gitjira/shared';

// LEARN: every fetch in the app goes through this one function. Today it
// only prefixes the path and unwraps JSON; in sprint 02 it will attach
// auth headers, and in sprint 03 it will translate the API's error
// contract. One choke-point means those become one-file changes.
export async function api(route, options = {}) {
  const res = await fetch(apiPath(route), {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
