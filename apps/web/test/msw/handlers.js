import { http, HttpResponse } from 'msw';

// LEARN (sprint 11): MSW (Mock Service Worker) intercepts at the NETWORK
// boundary — it patches fetch, not your modules. That matters: with a module
// mock (`vi.mock('../lib/api.js')`) the real api.js never runs, so the auth
// header, the 401-refresh dance, JSON parsing, and error handling are all
// stubbed away — you're testing a fake. With MSW, the real api client runs and
// only the wire is faked, so those code paths are exercised for real. You mock
// the thing you don't own (the server), not the code you're trying to test.
//
// Default happy-path handlers live here; a test overrides one with
// server.use(...) to simulate an error or empty state for THAT test only.

export const defaultProjects = [
  { id: 'p1', key: 'GJ', name: 'GitJira', description: null, leadId: 'u1', issueCounter: 3 },
  { id: 'p2', key: 'OPS', name: 'Operations', description: null, leadId: 'u1', issueCounter: 0 },
];

export const handlers = [
  http.get('*/api/projects', () => HttpResponse.json({ projects: defaultProjects })),

  http.get('*/api/projects/:key', ({ params }) => {
    const project = defaultProjects.find((p) => p.key === params.key);
    if (!project) {
      return HttpResponse.json({ error: { message: 'Project not found' } }, { status: 404 });
    }
    return HttpResponse.json({ project });
  }),
];
