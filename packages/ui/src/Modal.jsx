import { useEffect, useRef } from 'react';

// LEARN (sprint 14): an accessible modal has to do several things a <div> won't:
// - role="dialog" + aria-modal + a labelled title, so a screen reader announces
//   it as a dialog and not just some text that appeared.
// - TRAP focus inside while open (Tab from the last element wraps to the first),
//   so keyboard users can't tab out into the page behind the overlay.
// - Close on Escape.
// - Return focus to the element that opened it when it closes — otherwise the
//   keyboard user is dumped at the top of the page with no idea where they are.
//
// GOTCHA (planted): the focus-RETURN is missing below. We save the trigger in
// `previouslyFocused` but never restore it on close — a WCAG 2.4.3 (Focus Order)
// failure the review is meant to catch.
export function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Remember what had focus so we can (should) restore it on close.
    previouslyFocused.current = document.activeElement;

    // Move focus into the dialog.
    const dialog = dialogRef.current;
    const focusables = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusables[0] ?? dialog).focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      // Focus trap: wrap Tab / Shift+Tab at the edges.
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // BUG (planted, sprint 14 review): we should restore focus here —
      //   previouslyFocused.current?.focus();
      // Without it, closing the dialog drops focus to <body>.
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="gj-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="gj-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="gj-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
