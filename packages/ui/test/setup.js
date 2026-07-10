import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// LEARN (workflow-hardening): register the axe matcher so any test can assert
// `toHaveNoViolations`. This runs the REAL axe-core rules against the rendered
// DOM — Sprint 14 claimed axe coverage but never ran it; this makes it true.
expect.extend(axeMatchers);
