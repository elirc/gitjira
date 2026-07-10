import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// LEARN: one mock server for the whole test run. Tests add per-test overrides
// with `server.use(...)`; setup.js resets them between tests so no override
// leaks (order-independence — see TESTING.md).
export const server = setupServer(...handlers);
