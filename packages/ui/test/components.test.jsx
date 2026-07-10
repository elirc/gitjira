import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../src/Button.jsx';
import { Modal } from '../src/Modal.jsx';

// LEARN (sprint 14): accessible components are TESTABLE for accessibility. These
// assert the behaviors a screen-reader / keyboard user depends on — the dialog
// role, the label, focus moving in, Escape closing — not how it looks.

describe('Button', () => {
  it('forwards native props and appends className to the base', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" className="mine" onClick={onClick}>
        Save
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveClass('gj-btn', 'gj-btn--primary', 'mine');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('exposes its DOM node via ref (a primitive must be focusable by callers)', () => {
    const ref = { current: null };
    render(<Button ref={ref}>x</Button>);
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});

describe('Modal', () => {
  it('renders as a labelled dialog and moves focus inside on open', () => {
    render(
      <Modal open title="Confirm delete" onClose={() => {}}>
        <button>Delete</button>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'Confirm delete' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // focus moved to the first focusable inside the dialog
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }));
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="X" onClose={onClose}>
        <button>ok</button>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="X" onClose={() => {}}>
        <button>ok</button>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the trigger when it closes (WCAG 2.4.3)', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} title="Dlg" onClose={() => setOpen(false)}>
            <button>inside</button>
          </Modal>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger); // open (focus moves into the dialog)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'inside' }));
    fireEvent.keyDown(document, { key: 'Escape' }); // close
    // Focus must return to the trigger, not vanish to <body>.
    expect(document.activeElement).toBe(trigger);
  });
});
