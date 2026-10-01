// The only place the browser talks to the server. Every call is same-origin
// JSON with the session cookie; failures become Error objects that carry the
// HTTP status and, for 409 conflicts, the current server copy of the issue.

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      // Writes must carry this custom header. A cross-site form or fetch cannot
      // add it, so the server can reject cross-origin writes (see src/app.js).
      ...(options.method && options.method !== "GET" ? { "X-GitJira-Request": "1" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status}).`);
    error.status = response.status;
    // On a 409 the server includes the issue as it exists now, so the conflict
    // UI can offer "load latest version" without another round trip.
    error.current = body.current;
    error.code = body.code;
    throw error;
  }
  return body;
}
