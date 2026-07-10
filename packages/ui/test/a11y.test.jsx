import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from '../src/Button.jsx';
import { Modal } from '../src/Modal.jsx';

// LEARN (workflow-hardening): a REAL automated accessibility check. Sprint 14
// claimed "axe wired into the tests" but never actually ran axe. This does —
// axe-core evaluates its rule set against the rendered DOM in jsdom. Note jsdom
// can't compute layout, so color-contrast rules are skipped here (that's why the
// manual contrast audit + a browser axe run in CI still matter); but structure,
// ARIA, roles, names, and focusability ARE checked for real.

describe('accessibility (axe-core, real run)', () => {
  it('Button has no axe violations', async () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Modal (as a labelled dialog) has no axe violations', async () => {
    const { container } = render(
      <Modal open title="Delete issue?" onClose={() => {}}>
        <p>This cannot be undone.</p>
        <Button variant="danger">Delete</Button>
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
