import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server.js';

// LEARN (sprint 11): the MSW lifecycle every project uses.
// - listen once, with onUnhandledRequest:'error' so a fetch we forgot to mock
//   FAILS loudly instead of silently hitting the real network (or hanging).
// - resetHandlers after each test so a per-test `server.use(...)` override can't
//   leak into the next test — this is what keeps tests order-independent.
// - close at the end to unpatch fetch.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
